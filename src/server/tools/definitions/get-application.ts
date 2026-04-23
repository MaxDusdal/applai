import { z } from "zod";
import { ApplicationService } from "@/server/services/application";
import { defineTool } from "../types";

export const getApplication = defineTool({
  name: "getApplication",
  description:
    "Get details of a specific application including job description, metadata, documents with full content, and activity",
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
      metadata: app.metadata.map((m) => ({ key: m.key, value: m.value })),
      documents: app.documents.map((d) => {
        if (d.isUploadedPdf) {
          return {
            id: d.id,
            type: d.type,
            name: d.name,
            isUploadedPdf: true as const,
            extractedText: d.extractedText ?? null,
            updatedAt: d.updatedAt.toISOString(),
          };
        }
        const isYamlDriven = !!d.yamlContent;
        return {
          id: d.id,
          type: d.type,
          name: d.name,
          isUploadedPdf: false as const,
          isYamlDriven,
          yamlContent: d.yamlContent ?? null,
          typstSource: d.source,
          templateId: d.templateId,
          updatedAt: d.updatedAt.toISOString(),
        };
      }),
      activities: app.activities.slice(0, 10).map((a) => ({
        type: a.type,
        description: a.description,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  },
});
