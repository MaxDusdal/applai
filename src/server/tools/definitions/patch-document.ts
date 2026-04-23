import { z } from "zod";
import { DocumentService } from "@/server/services/document";
import { defineTool } from "../types";
import { applyPatches, PatchError } from "../utils/apply-patches";

const patchSchema = z.object({
  old_string: z
    .string()
    .describe("Exact text to find (must appear exactly once)"),
  new_string: z.string().describe("Replacement text"),
});

export const patchDocument = defineTool({
  name: "patchDocument",
  description:
    "Apply search-and-replace patches to a document. Use instead of updateDocument when making targeted edits — only the changed portions need to be sent. Each patch's old_string must match exactly once in the current content. Patches are applied sequentially. Specify target: 'yamlContent' for YAML-driven data edits, or 'typstSource' for layout edits.",
  inputSchema: z
    .object({
      applicationId: z.string().describe("The application ID"),
      documentId: z
        .string()
        .optional()
        .describe(
          "Specific document ID (preferred when multiple docs of the same type exist)",
        ),
      type: z
        .enum(["CV", "COVER_LETTER", "ADDITIONAL"])
        .optional()
        .describe("Document type"),
      target: z
        .enum(["yamlContent", "typstSource"])
        .describe("Which content field to patch"),
      patches: z
        .array(patchSchema)
        .min(1)
        .describe(
          "Ordered list of search-and-replace patches to apply sequentially",
        ),
    })
    .refine((d) => d.documentId ?? d.type, "Provide documentId or type"),
  needsApproval: true,
  execute: async (
    { applicationId, documentId, type, target, patches },
    ctx,
  ) => {
    let doc;
    if (documentId) {
      doc = await ctx.db.document.findFirst({
        where: { id: documentId, userId: ctx.userId },
      });
    } else {
      doc = await ctx.db.document.findFirst({
        where: { applicationId, userId: ctx.userId, type: type! },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!doc) {
      return {
        error: "Document not found. Provide a valid documentId or type.",
      };
    }

    if (doc.isUploadedPdf) {
      return {
        error:
          "This document is an uploaded PDF and cannot be edited. You can only read its extracted text via getDocument.",
      };
    }

    const currentContent =
      target === "yamlContent" ? (doc.yamlContent ?? "") : doc.source;

    if (!currentContent) {
      return {
        error: `Document has no ${target} content to patch. Use updateDocument to set initial content.`,
      };
    }

    let patched: string;
    try {
      patched = applyPatches(currentContent, patches);
    } catch (e) {
      if (e instanceof PatchError) {
        return { error: e.message };
      }
      throw e;
    }

    const service = new DocumentService(ctx.db);
    await service.update(ctx.userId, doc.id, {
      ...(target === "yamlContent"
        ? { yamlContent: patched }
        : { source: patched }),
    }, { trigger: "AI_EDIT", versionLabel: "Before AI edit" });

    return { success: true, documentId: doc.id };
  },
});
