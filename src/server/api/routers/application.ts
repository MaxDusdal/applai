import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ApplicationService } from "@/server/services/application";
import { generateObject } from "ai";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  buf: Buffer,
) => Promise<{ text: string }>;

const applicationStatusValues = [
  "RESEARCH",
  "DRAFT",
  "READY",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

const applicationTypeValues = ["INTERNAL", "EXTERNAL"] as const;

export const applicationRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const service = new ApplicationService(ctx.db);
    return service.list(ctx.session.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new ApplicationService(ctx.db);
      return service.get(ctx.session.user.id, input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        company: z.string().min(1),
        role: z.string().min(1),
        type: z.enum(applicationTypeValues).optional(),
        jobDescription: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = new ApplicationService(ctx.db);
      return service.create(ctx.session.user.id, input);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        company: z.string().min(1).optional(),
        role: z.string().min(1).optional(),
        status: z.enum(applicationStatusValues).optional(),
        type: z.enum(applicationTypeValues).optional(),
        jobDescription: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const service = new ApplicationService(ctx.db);
      return service.update(ctx.session.user.id, id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new ApplicationService(ctx.db);
      return service.delete(ctx.session.user.id, input.id);
    }),

  createMeta: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        key: z.string().min(1),
        value: z.string(),
        order: z.number().int(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = new ApplicationService(ctx.db);
      return service.createMeta(
        ctx.session.user.id,
        input.applicationId,
        input.key,
        input.value,
        input.order,
      );
    }),

  updateMeta: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        applicationId: z.string(),
        key: z.string().min(1),
        value: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = new ApplicationService(ctx.db);
      return service.updateMeta(
        ctx.session.user.id,
        input.id,
        input.applicationId,
        input.key,
        input.value,
      );
    }),

  deleteMeta: protectedProcedure
    .input(z.object({ id: z.string(), applicationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new ApplicationService(ctx.db);
      return service.deleteMeta(
        ctx.session.user.id,
        input.id,
        input.applicationId,
      );
    }),

  createWithMeta: protectedProcedure
    .input(
      z.object({
        company: z.string().min(1),
        role: z.string().min(1),
        type: z.enum(applicationTypeValues).optional(),
        jobDescription: z.string().optional(),
        metadata: z
          .array(z.object({ key: z.string(), value: z.string() }))
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = new ApplicationService(ctx.db);
      return service.createWithMeta(ctx.session.user.id, input);
    }),

  parseJobDescription: protectedProcedure
    .input(
      z
        .object({
          text: z.string().optional(),
          url: z.string().url().optional(),
          pdfBase64: z.string().optional(),
        })
        .refine(
          (d) => d.text ?? d.url ?? d.pdfBase64,
          "Provide text, url, or pdfBase64",
        ),
    )
    .mutation(async ({ input }) => {
      let jobText: string;

      if (input.url) {
        const res = await fetch(input.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ApplyAI/1.0)" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/pdf")) {
          const buf = Buffer.from(await res.arrayBuffer());
          const parsed = await pdfParse(buf);
          jobText = parsed.text;
        } else {
          const html = await res.text();
          jobText = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&[a-z]+;/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
        }
      } else if (input.pdfBase64) {
        const buf = Buffer.from(input.pdfBase64, "base64");
        const parsed = await pdfParse(buf);
        jobText = parsed.text;
      } else {
        jobText = input.text!;
      }

      if (jobText.length < 10) {
        throw new Error("Could not extract enough text from the input");
      }

      // Truncate to avoid sending too much to the model
      const truncated = jobText.slice(0, 15000);

      const result = await generateObject({
        model: "anthropic/claude-sonnet-4-20250514",
        prompt: `Extract structured information from this job posting.

JOB POSTING:
${truncated}

Instructions:
- Extract the company name and role/job title.
- For the job description: copy the relevant content AS-IS from the posting. Do NOT rewrite, summarise, or paraphrase any sentences. Only remove obvious navigation chrome, cookie banners, repeated boilerplate headers/footers, and fix any encoding artifacts or broken whitespace. The goal is that the saved text reads exactly as the employer wrote it.
- Extract additional structured details (location, salary, contract type, career level, department, application deadline, etc.) as key-value metadata. Only include fields that are explicitly stated in the posting.`,
        schema: z.object({
          company: z.string().describe("The company name"),
          role: z.string().describe("The job title / role name"),
          jobDescription: z
            .string()
            .describe(
              "The job description text exactly as written by the employer — do not rewrite or summarise. Only strip non-content elements (nav bars, cookie notices, repeated page headers/footers).",
            ),
          metadata: z
            .array(
              z.object({
                key: z
                  .string()
                  .describe(
                    "Field name (e.g., Location, Career Level, Salary, Contract Type)",
                  ),
                value: z
                  .string()
                  .describe("Field value as stated in the posting"),
              }),
            )
            .describe(
              "Explicitly stated details as key-value pairs — only include what the posting actually says",
            ),
        }),
        maxOutputTokens: 4096,
      });

      return result.object;
    }),
});
