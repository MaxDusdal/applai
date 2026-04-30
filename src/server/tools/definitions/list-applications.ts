import { z } from "zod";
import { ApplicationService } from "@/server/services/application";
import { defineTool } from "../types";

export const listApplications = defineTool({
  name: "listApplications",
  description:
    "List all of the user's job applications with their status, metadata, and document summaries",
  inputSchema: z.object({}),
  execute: async (_input, ctx) => {
    const service = new ApplicationService(ctx.db);
    const apps = await service.list(ctx.userId);
    return apps.map((a) => ({
      id: a.id,
      company: a.company,
      role: a.role,
      status: a.status,
      updatedAt: a.updatedAt.toISOString(),
      metadata: a.metadata.map((m) => ({ key: m.key, value: m.value })),
      documents: a.documents.map((d) => ({ type: d.type, name: d.name })),
    }));
  },
});
