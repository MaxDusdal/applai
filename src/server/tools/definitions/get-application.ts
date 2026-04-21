import { z } from "zod";
import { ApplicationService } from "@/server/services/application";
import { defineTool } from "../types";

export const getApplication = defineTool({
  name: "getApplication",
  description:
    "Get details of a specific application including job description, documents, and activity",
  inputSchema: z.object({
    applicationId: z.string().describe("The application ID"),
  }),
  execute: async ({ applicationId }, ctx) => {
    const service = new ApplicationService(ctx.db);
    const app = await service.get(ctx.userId, applicationId);
    if (!app) return { error: "Application not found" };
    return {
      id: app.id,
      company: app.company,
      role: app.role,
      status: app.status,
      jobDescription: app.jobDescription,
      documents: app.documents.map((d) => ({
        id: d.id,
        type: d.type,
        name: d.name,
        isUploadedPdf: d.isUploadedPdf,
        hasContent: d.isUploadedPdf || d.source.length > 0,
        updatedAt: d.updatedAt.toISOString(),
      })),
      activities: app.activities.slice(0, 10).map((a) => ({
        type: a.type,
        description: a.description,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  },
});
