import { z } from "zod";
import { ApplicationService } from "@/server/services/application";
import { defineTool } from "../types";

export const updateApplication = defineTool({
  name: "updateApplication",
  description:
    "Update fields on a job application (company, role, status, job description)",
  inputSchema: z.object({
    applicationId: z.string().describe("The application ID"),
    company: z.string().optional().describe("Updated company name"),
    role: z.string().optional().describe("Updated role/position"),
    status: z
      .enum([
        "RESEARCH",
        "DRAFT",
        "READY",
        "APPLIED",
        "INTERVIEW",
        "OFFER",
        "REJECTED",
        "WITHDRAWN",
      ])
      .optional()
      .describe("Updated application status"),
    jobDescription: z
      .string()
      .optional()
      .describe("Updated job description text"),
  }),
  needsApproval: true,
  execute: async ({ applicationId, ...data }, ctx) => {
    const service = new ApplicationService(ctx.db);
    await service.update(ctx.userId, applicationId, data);
    return { success: true };
  },
});
