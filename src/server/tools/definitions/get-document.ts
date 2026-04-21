import { z } from "zod";
import { defineTool } from "../types";

export const getDocument = defineTool({
  name: "getDocument",
  description:
    "Read a document (CV, Cover Letter, or Additional). Returns isYamlDriven, yamlContent (the data to edit), and typstSource (the layout — only touch this if the user asks to change the visual design) for Typst documents. For uploaded PDFs, returns extractedText — these cannot be edited.",
  inputSchema: z
    .object({
      applicationId: z.string().describe("The application ID"),
      documentId: z
        .string()
        .optional()
        .describe("Specific document ID (preferred when multiple docs of the same type exist)"),
      type: z
        .enum(["CV", "COVER_LETTER", "ADDITIONAL"])
        .optional()
        .describe("Document type (used as fallback if documentId is not provided)"),
    })
    .refine((d) => d.documentId ?? d.type, "Provide documentId or type"),
  execute: async ({ applicationId, documentId, type }, ctx) => {
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

    if (!doc) return { exists: false };

    if (doc.isUploadedPdf) {
      return {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        exists: true,
        isUploadedPdf: true,
        extractedText: doc.extractedText ?? null,
        updatedAt: doc.updatedAt.toISOString(),
      };
    }

    const isYamlDriven = !!doc.yamlContent;
    return {
      id: doc.id,
      name: doc.name,
      type: doc.type,
      exists: doc.source.length > 0 || !!doc.yamlContent,
      isUploadedPdf: false,
      isYamlDriven,
      yamlContent: doc.yamlContent ?? null,
      typstSource: doc.source,
      templateId: doc.templateId,
      updatedAt: doc.updatedAt.toISOString(),
    };
  },
});
