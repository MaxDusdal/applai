import { z } from "zod";
import { ApplicationService } from "@/server/services/application";
import { defineTool } from "../types";

export const createApplication = defineTool({
  name: "createApplication",
  description:
    "Create a new job application. Extract company name, role, and metadata (location, career level, contract type, salary, etc.) from the job description. Store the job description verbatim — do NOT rewrite, summarise, or paraphrase any sentences. Only strip non-content chrome (nav bars, cookie notices, repeated headers/footers).",
  inputSchema: z.object({
    company: z.string().describe("The company name"),
    role: z.string().describe("The job title / role name"),
    jobDescription: z
      .string()
      .optional()
      .describe(
        "The job description text exactly as written by the employer — preserve every sentence verbatim",
      ),
    metadata: z
      .array(
        z.object({
          key: z
            .string()
            .describe(
              "Field name (e.g., Location, Career Level, Salary, Contract Type)",
            ),
          value: z.string().describe("Field value as stated in the posting"),
        }),
      )
      .optional()
      .describe(
        "Explicitly stated details as key-value pairs — only include what the posting actually says",
      ),
  }),
  needsApproval: true,
  execute: async ({ company, role, jobDescription, metadata }, ctx) => {
    const service = new ApplicationService(ctx.db);
    const app = await service.createWithMeta(ctx.userId, {
      company,
      role,
      jobDescription,
      metadata,
    });
    return { id: app.id, company: app.company, role: app.role };
  },
});
