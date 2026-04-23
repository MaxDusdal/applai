import { z } from "zod";
import { DocumentVersionService } from "@/server/services/document-version";
import { defineTool } from "../types";

export const listDocumentVersions = defineTool({
  name: "listDocumentVersions",
  description:
    "List version history for a document. Returns versions with timestamps, triggers, and labels. Use to review what changes were made and when.",
  inputSchema: z
    .object({
      applicationId: z
        .string()
        .describe("The application ID"),
      documentId: z
        .string()
        .optional()
        .describe("Specific document ID (preferred when multiple docs of the same type exist)"),
      type: z
        .enum(["CV", "COVER_LETTER", "ADDITIONAL"])
        .optional()
        .describe("Document type (used to find the document if documentId not provided)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe("Max versions to return (default 20)"),
    })
    .refine((d) => d.documentId ?? d.type, "Provide documentId or type"),
  execute: async ({ applicationId, documentId, type, limit }, ctx) => {
    let docId = documentId;

    if (!docId) {
      const doc = await ctx.db.document.findFirst({
        where: { applicationId, userId: ctx.userId, type: type! },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!doc) return { error: "Document not found." };
      docId = doc.id;
    }

    const versionService = new DocumentVersionService(ctx.db);
    return versionService.listVersions(ctx.userId, docId, { limit });
  },
});
