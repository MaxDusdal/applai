import { z } from "zod";
import { DocumentService } from "@/server/services/document";
import { defineTool } from "../types";

export const updateDocument = defineTool({
  name: "updateDocument",
  description:
    "Create or update a document (CV, Cover Letter, or Additional). Call getDocument first. If isYamlDriven=true: provide yamlContent only — ALL content lives there (names, dates, bullets, skills); do NOT touch typstSource unless the user explicitly asks to change the layout. If isYamlDriven=false: provide typstSource. Never modify typstSource just to update content. Uploaded PDFs (isUploadedPdf=true) cannot be edited.",
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
      yamlContent: z
        .string()
        .optional()
        .describe("Updated YAML data (for YAML-driven documents)"),
      typstSource: z
        .string()
        .optional()
        .describe(
          "Updated Typst layout source (only when changing the template itself)",
        ),
    })
    .refine((d) => d.documentId ?? d.type, "Provide documentId or type"),
  needsApproval: true,
  execute: async (
    { applicationId, documentId, type, yamlContent, typstSource },
    ctx,
  ) => {
    const service = new DocumentService(ctx.db);

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
      // Create new document if not found (only for type-based lookup)
      if (!type)
        return {
          error: "Document not found. Provide a valid documentId or type.",
        };
      doc = await service.create(ctx.userId, applicationId, {
        type,
        name:
          type === "CV"
            ? "CV"
            : type === "COVER_LETTER"
              ? "Cover Letter"
              : "Document",
        source: typstSource ?? "",
        yamlContent,
      });
      return { success: true, documentId: doc.id };
    }

    if (doc.isUploadedPdf) {
      return {
        error:
          "This document is an uploaded PDF and cannot be edited. You can only read its extracted text via getDocument.",
      };
    }

    await service.update(ctx.userId, doc.id, {
      ...(yamlContent !== undefined && { yamlContent }),
      ...(typstSource !== undefined && { source: typstSource }),
    });
    return { success: true, documentId: doc.id };
  },
});
