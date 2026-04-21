"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type UIMessage } from "ai";import { useAgent, AGENT_MODELS } from "@/components/agent/agent-provider";
import { api } from "@/trpc/react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from "@/components/ai-elements/confirmation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector";
import { Bot, WrenchIcon, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const DEFAULT_MODEL = AGENT_MODELS[0]!.id;

const TOOL_LABELS: Record<string, string> = {
  getProfile: "Reading your profile",
  listApplications: "Listing your applications",
  getApplication: "Reading application details",
  getDocument: "Reading document",
  updateProfile: "Update profile",
  updateApplication: "Update application",
  updateDocument: "Update document",
  createApplication: "Create application",
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/([A-Z])/g, " $1").trim();
}

type Props = {
  chatId: string;
  isActive: boolean;
};

function ChatInstanceInner({
  chatId,
  isActive,
  initialMessages,
  initialModelId,
}: {
  chatId: string;
  isActive: boolean;
  initialMessages: UIMessage[];
  initialModelId: string;
}) {
  const { pageContext } = useAgent();
  const [modelId, setModelIdState] = useState(initialModelId);

  const setModel = api.chat.setModel.useMutation();

  const handleModelChange = (id: string) => {
    setModelIdState(id);
    setModel.mutate({ id: chatId, modelId: id });
  };

  const { messages, sendMessage, status, addToolApprovalResponse } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: "/api/chat/agent",
      body: { pageContext, modelId, chatId },
    }),
    messages: initialMessages,
    sendAutomaticallyWhen: ({ messages: msgs }: { messages: UIMessage[] }) => {
      const last = msgs[msgs.length - 1];
      if (!last) return false;
      return last.parts.some(
        (p) =>
          p.type.startsWith("tool-") &&
          (p as { state?: string }).state === "approval-responded" &&
          (p as { approval?: { approved?: boolean } }).approval?.approved === true,
      );
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className={isActive ? "flex h-full flex-col" : "hidden"}>
      {/* Messages */}
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <ConversationEmptyState>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                  <Bot className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">AI Agent</p>
                  <p className="text-muted-foreground text-xs">
                    I can help you manage your profile, applications, and documents.
                  </p>
                </div>
                <div className="bg-muted/60 mt-2 rounded-lg px-3 py-2 text-left text-xs">
                  <p className="mb-1 font-medium">Try:</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>&bull; &quot;What&apos;s in my profile?&quot;</li>
                    <li>&bull; &quot;Set the Google application to Applied&quot;</li>
                    <li>&bull; &quot;Generate a CV for my Stripe application&quot;</li>
                  </ul>
                </div>
              </div>
            </ConversationEmptyState>
          )}

          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    if (!part.text.trim()) return null;
                    return <MessageResponse key={i}>{part.text}</MessageResponse>;
                  }

                  if (isToolUIPart(part)) {
                    const toolName = getToolName(part);

                    if (part.approval !== undefined) {
                      return (
                        <div key={part.toolCallId} className="w-full">
                          <Confirmation
                            approval={part.approval}
                            state={part.state}
                          >
                            <ConfirmationTitle>
                              {toolLabel(toolName)}
                            </ConfirmationTitle>
                            <ConfirmationRequest>
                              <ConfirmationActions>
                                <ConfirmationAction
                                  variant="outline"
                                  onClick={() =>
                                    addToolApprovalResponse({
                                      id: part.approval!.id,
                                      approved: false,
                                    })
                                  }
                                >
                                  Deny
                                </ConfirmationAction>
                                <ConfirmationAction
                                  onClick={() =>
                                    addToolApprovalResponse({
                                      id: part.approval!.id,
                                      approved: true,
                                    })
                                  }
                                >
                                  Approve
                                </ConfirmationAction>
                              </ConfirmationActions>
                            </ConfirmationRequest>
                            <ConfirmationAccepted>
                              <span className="text-xs text-muted-foreground">Approved</span>
                            </ConfirmationAccepted>
                            <ConfirmationRejected>
                              <span className="text-xs text-muted-foreground">Denied</span>
                            </ConfirmationRejected>
                          </Confirmation>
                        </div>
                      );
                    }

                    return (
                      <div key={part.toolCallId} className="flex items-center gap-1.5 text-xs text-muted-foreground py-0.5">
                        {part.state === "input-streaming" || part.state === "input-available" ? (
                          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                        ) : part.state === "output-error" ? (
                          <XCircle className="h-3 w-3 shrink-0 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        )}
                        <WrenchIcon className="h-3 w-3 shrink-0" />
                        <span>{toolLabel(toolName)}</span>
                      </div>
                    );
                  }

                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="shrink-0 border-t p-3">
        <PromptInput
          onSubmit={(message) => {
            if (!message.text.trim() || isLoading) return;
            void sendMessage({ text: message.text });
          }}
        >
          <PromptInputTextarea
            placeholder="Ask the agent anything..."
            className="max-h-32 min-h-0"
            autoFocus={isActive}
          />
          <PromptInputFooter>
            <ModelSelector>
              <ModelSelectorTrigger className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <ModelSelectorLogo provider="anthropic" className="size-3" />
                {AGENT_MODELS.find((m) => m.id === modelId)?.label ?? "Model"}
              </ModelSelectorTrigger>
              <ModelSelectorContent>
                <ModelSelectorInput placeholder="Search models..." />
                <ModelSelectorList>
                  <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                  <ModelSelectorGroup heading="Anthropic">
                    {AGENT_MODELS.map((m) => (
                      <ModelSelectorItem
                        key={m.id}
                        value={m.id}
                        onSelect={() => handleModelChange(m.id)}
                      >
                        <ModelSelectorLogo provider={m.provider.toLowerCase()} />
                        <ModelSelectorName>{m.label}</ModelSelectorName>
                        {m.id === modelId && (
                          <span className="text-xs text-muted-foreground">active</span>
                        )}
                      </ModelSelectorItem>
                    ))}
                  </ModelSelectorGroup>
                </ModelSelectorList>
              </ModelSelectorContent>
            </ModelSelector>
            <PromptInputSubmit status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

export function ChatInstance({ chatId, isActive }: Props) {
  const { data, isLoading } = api.chat.get.useQuery({ id: chatId });

  if (isLoading) {
    return (
      <div className={isActive ? "flex h-full flex-col gap-3 p-4" : "hidden"}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!data) return null;

  const initialMessages = (data.messages ?? []) as unknown as UIMessage[];
  const initialModelId = data.modelId ?? DEFAULT_MODEL;

  return (
    <ChatInstanceInner
      chatId={chatId}
      isActive={isActive}
      initialMessages={initialMessages}
      initialModelId={initialModelId}
    />
  );
}
