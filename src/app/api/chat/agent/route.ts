import {
  convertToModelMessages,
  streamText,
  generateText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { auth } from "@/server/better-auth";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { ChatService } from "@/server/services/chat";
import { toAiSdkTools } from "@/server/tools/adapters/ai-sdk";
import { allTools } from "@/server/tools/definitions";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const { messages, pageContext, modelId, chatId } = (await req.json()) as {
    messages: UIMessage[];
    pageContext?: { page: string; applicationId?: string; documentType?: string; documentId?: string };
    modelId?: string;
    chatId?: string;
  };

  if (!chatId) {
    return new Response("chatId is required", { status: 400 });
  }

  // Ownership guard
  const chatService = new ChatService(db);
  const chat = await chatService.get(userId, chatId);
  if (!chat) {
    return new Response("Chat not found", { status: 403 });
  }

  const ALLOWED_MODELS = [
    "anthropic/claude-sonnet-4-20250514",
    "anthropic/claude-opus-4-20250514",
    "anthropic/claude-haiku-4-5-20251001",
  ];
  const model = modelId && ALLOWED_MODELS.includes(modelId)
    ? modelId
    : "anthropic/claude-sonnet-4-20250514";

  // Build a brief context summary so the model knows where the user is
  let contextSummary = "";
  if (pageContext) {
    switch (pageContext.page) {
      case "profile":
        contextSummary = "The user is currently viewing their Profile editor.";
        break;
      case "dashboard":
        contextSummary = "The user is on the Applications dashboard.";
        break;
      case "application":
        contextSummary = `The user is viewing application ${pageContext.applicationId ?? "(unknown)"}.`;
        break;
      case "document":
        contextSummary = `The user is viewing document ${pageContext.documentId ?? "(unknown)"} for application ${pageContext.applicationId ?? "(unknown)"}.`;
        break;
    }
  }

  const systemPrompt = `You are an AI assistant for a job application management tool called "Apply AI". You help users manage their professional profile, job applications, and application documents (CVs and cover letters).

${contextSummary ? `CURRENT CONTEXT: ${contextSummary}` : ""}

You have tools to read and modify the user's data. Use them to fulfill requests.

JOB DESCRIPTION FIDELITY — TOP PRIORITY:
- When creating or storing a job description, preserve the employer's original wording exactly. Do NOT rewrite, summarise, paraphrase, or improve any sentences.
- Only strip obvious non-content elements: navigation chrome, cookie notices, repeated page headers/footers, and fix encoding artifacts or broken whitespace.
- The stored job description must read exactly as the employer wrote it. This is critical because the user relies on the verbatim text to tailor documents and prepare for interviews.

GUIDELINES:
- Read operations: call the tool directly. Write operations: describe what you plan to change first — the user will be asked to approve.
- For CVs/cover letters: always read the user's profile and the application (including job description) before generating or updating.
- For profile updates: return the COMPLETE updated markdown. Read the current profile first if you don't have it.
- Be concise. If the user refers to "this application" or "this document", use the page context.`;

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 8192,
    stopWhen: stepCountIs(5),
    tools: toAiSdkTools(allTools, { userId, db }),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: finishedMessages }) => {
      try {
        await chatService.saveMessages(userId, chatId, finishedMessages);

        // Fire-and-forget title generation for new chats
        const userMessages = finishedMessages.filter((m) => m.role === "user");
        const assistantMessages = finishedMessages.filter((m) => m.role === "assistant");
        if (chat.title === null && userMessages.length >= 1 && assistantMessages.length >= 1) {
          void (async () => {
            try {
              const firstUser = userMessages[0];
              const firstAssistant = assistantMessages[0];
              const extractText = (msg: UIMessage) =>
                msg.parts
                  .filter((p): p is { type: "text"; text: string } => p.type === "text")
                  .map((p) => p.text)
                  .join(" ")
                  .slice(0, 300);

              const userText = firstUser ? extractText(firstUser) : "";
              const assistantText = firstAssistant ? extractText(firstAssistant) : "";

              const { text } = await generateText({
                model: "anthropic/claude-haiku-4-5-20251001",
                prompt: `Summarize this conversation exchange in 3-5 words, no punctuation, no quotes:\nUser: ${userText}\nAssistant: ${assistantText}`,
                maxOutputTokens: 20,
              });
              const title = text.trim().replace(/[.,"'!?;:]+$/, "").slice(0, 60);
              if (title) {
                await chatService.setTitleIfEmpty(userId, chatId, title);
              }
            } catch {
              // Non-critical — ignore title gen failures
            }
          })();
        }
      } catch (err) {
        console.error("[chat/agent] onFinish save error:", err);
      }
    },
  });
}
