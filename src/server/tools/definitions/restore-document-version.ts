import { z } from "zod";
import { DocumentVersionService } from "@/server/services/document-version";
import { defineTool } from "../types";

export const restoreDocumentVersion = defineTool({
  name: "restoreDocumentVersion",
  description:
    "Restore a document to a previous version. This snapshots the current state first, then applies the old version's content. The action is reversible — a new version entry is created.",
  inputSchema: z.object({
    versionId: z.string().describe("The version ID to restore"),
  }),
  needsApproval: true,
  execute: async ({ versionId }, ctx) => {
    const versionService = new DocumentVersionService(ctx.db);

    const version = await versionService.getVersion(ctx.userId, versionId);
    if (!version) return { error: "Version not found." };

    const doc = await versionService.restoreVersion(ctx.userId, versionId);
    return { success: true, documentId: doc.id, restoredToVersion: version.version };
  },
});
