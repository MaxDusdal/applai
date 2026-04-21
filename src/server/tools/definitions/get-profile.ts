import { z } from "zod";
import { ProfileService } from "@/server/services/profile";
import { defineTool } from "../types";

export const getProfile = defineTool({
  name: "getProfile",
  description: "Read the user's professional profile content",
  inputSchema: z.object({}),
  execute: async (_input, ctx) => {
    const service = new ProfileService(ctx.db);
    const profile = await service.getOrCreate(ctx.userId);
    return {
      content: profile.content,
      updatedAt: profile.updatedAt.toISOString(),
    };
  },
});
