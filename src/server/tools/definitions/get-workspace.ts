import { z } from "zod";
import { ApplicationService } from "@/server/services/application";
import { ProfileService } from "@/server/services/profile";
import { defineTool } from "../types";

export const getWorkspace = defineTool({
  name: "getWorkspace",
  description:
    "Get everything needed to work on an application in a single call: the user's professional profile, full application details with metadata, all documents with content, and recent activity.",
  inputSchema: z.object({
    applicationId: z.string().describe("The application ID"),
  }),
  execute: async ({ applicationId }, ctx) => {
    const appService = new ApplicationService(ctx.db);
    const profileService = new ProfileService(ctx.db);

    const [app, profile] = await Promise.all([
      appService.get(ctx.userId, applicationId),
      profileService.getOrCreate(ctx.userId),
    ]);

    if (!app) return { error: "Application not found" };

    return {
      profile: {
        content: profile.content,
        updatedAt: profile.updatedAt.toISOString(),
      },
      application: {
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
      },
    };
  },
});
