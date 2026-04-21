import { z } from "zod";
import { ProfileService } from "@/server/services/profile";
import { defineTool } from "../types";

export const updateProfile = defineTool({
  name: "updateProfile",
  description:
    "Update the user's professional profile. Provide the complete updated markdown content.",
  inputSchema: z.object({
    content: z
      .string()
      .describe("The complete updated profile in markdown format"),
  }),
  needsApproval: true,
  execute: async ({ content }, ctx) => {
    const service = new ProfileService(ctx.db);
    await service.update(ctx.userId, content);
    return { success: true };
  },
});
