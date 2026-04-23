import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { DocumentService } from "@/server/services/document";
import { DocumentVersionService } from "@/server/services/document-version";
import { TemplateService } from "@/server/services/template";
import { CompilationService } from "@/server/services/compilation";
import { PdfUploadService } from "@/server/services/pdf-upload";
import type { Prisma } from "@prisma/client";

const documentTypeValues = ["CV", "COVER_LETTER", "ADDITIONAL"] as const;

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

export const documentRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new DocumentService(ctx.db);
      const doc = await service.getById(ctx.session.user.id, input.id);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      return doc;
    }),

  listByApplication: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new DocumentService(ctx.db);
      return service.listByApplication(ctx.session.user.id, input.applicationId);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        source: z.string().optional(),
        yamlContent: z.string().optional(),
        chatHistory: z.unknown().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const service = new DocumentService(ctx.db);
      return service.update(ctx.session.user.id, id, {
        source: data.source,
        yamlContent: data.yamlContent,
        chatHistory: data.chatHistory as Prisma.InputJsonValue | undefined,
      });
    }),

  updateName: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const service = new DocumentService(ctx.db);
      return service.updateName(ctx.session.user.id, input.id, input.name);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new DocumentService(ctx.db);
      return service.delete(ctx.session.user.id, input.id);
    }),

  createFromTemplate: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        type: z.enum(documentTypeValues),
        name: z.string().min(1),
        templateId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const templateService = new TemplateService();
      const [source, yamlContent] = await Promise.all([
        templateService.getTypContent(input.templateId),
        templateService.getYamlContent(input.templateId),
      ]);

      const docService = new DocumentService(ctx.db);
      const doc = await docService.create(ctx.session.user.id, input.applicationId, {
        type: input.type,
        name: input.name,
        source,
        yamlContent,
        templateId: input.templateId,
      });

      const versionService = new DocumentVersionService(ctx.db);
      await versionService.createVersion(doc.id, {
        source: doc.source,
        yamlContent: doc.yamlContent,
        trigger: "TEMPLATE_LOAD",
        label: "Created from template",
      });

      return doc;
    }),

  upload: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        type: z.enum(documentTypeValues),
        name: z.string().min(1),
        pdfBase64: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const buf = Buffer.from(input.pdfBase64, "base64");
      if (buf.byteLength > MAX_PDF_BYTES) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "PDF exceeds 10 MB limit.",
        });
      }

      const application = await ctx.db.application.findFirst({
        where: { id: input.applicationId, userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!application) throw new TRPCError({ code: "NOT_FOUND" });

      const pdfService = new PdfUploadService();
      const filename = `${ctx.session.user.id}/${input.applicationId}/${Date.now()}_${input.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}.pdf`;
      const { url, extractedText } = await pdfService.upload(buf, filename);

      const docService = new DocumentService(ctx.db);
      return docService.create(ctx.session.user.id, input.applicationId, {
        type: input.type,
        name: input.name,
        pdfUrl: url,
        extractedText,
        isUploadedPdf: true,
      });
    }),

  listVersions: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        limit: z.number().int().min(1).max(50).optional(),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const versionService = new DocumentVersionService(ctx.db);
      return versionService.listVersions(ctx.session.user.id, input.documentId, {
        limit: input.limit,
        cursor: input.cursor,
      });
    }),

  getVersion: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const versionService = new DocumentVersionService(ctx.db);
      const version = await versionService.getVersion(ctx.session.user.id, input.versionId);
      if (!version) throw new TRPCError({ code: "NOT_FOUND" });
      return version;
    }),

  createVersion: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        label: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const docService = new DocumentService(ctx.db);
      const doc = await docService.getById(ctx.session.user.id, input.documentId);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      if (doc.isUploadedPdf) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot version uploaded PDFs." });
      }

      const versionService = new DocumentVersionService(ctx.db);
      return versionService.createVersion(doc.id, {
        source: doc.source,
        yamlContent: doc.yamlContent,
        trigger: "MANUAL",
        label: input.label,
      });
    }),

  restoreVersion: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const versionService = new DocumentVersionService(ctx.db);
      return versionService.restoreVersion(ctx.session.user.id, input.versionId);
    }),

  compile: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.db.document.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!document) throw new TRPCError({ code: "NOT_FOUND" });

      if (document.isUploadedPdf) {
        if (!document.pdfUrl) throw new TRPCError({ code: "NOT_FOUND", message: "No PDF stored." });
        const pdfService = new PdfUploadService();
        const res = await pdfService.stream(document.pdfUrl);
        if (!res.ok) throw new TRPCError({ code: "NOT_FOUND", message: "Failed to retrieve PDF." });
        const buf = Buffer.from(await res.arrayBuffer());
        return buf.toString("base64");
      }

      const compilationService = new CompilationService();
      const pdf = await compilationService.compile(
        document.source,
        document.yamlContent ?? undefined,
      );
      return pdf.toString("base64");
    }),

  compileSource: protectedProcedure
    .input(z.object({ source: z.string(), yamlContent: z.string().optional() }))
    .mutation(async ({ input }) => {
      const compilationService = new CompilationService();
      const pdf = await compilationService.compile(input.source, input.yamlContent);
      return pdf.toString("base64");
    }),
});
