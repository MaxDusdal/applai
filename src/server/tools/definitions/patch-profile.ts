import { z } from "zod";
import { ProfileService } from "@/server/services/profile";
import { defineTool } from "../types";
import { applyPatches, PatchError } from "../utils/apply-patches";

const patchSchema = z.object({
  old_string: z
    .string()
    .describe("Exact text to find (must appear exactly once)"),
  new_string: z.string().describe("Replacement text"),
});

export const patchProfile = defineTool({
  name: "patchProfile",
  description:
    "Apply search-and-replace patches to the user's professional profile. Use instead of updateProfile when making targeted edits — only the changed portions need to be sent. Each patch's old_string must match exactly once in the current content. Patches are applied sequentially.",
  inputSchema: z.object({
    patches: z
      .array(patchSchema)
      .min(1)
      .describe(
        "Ordered list of search-and-replace patches to apply sequentially",
      ),
  }),
  needsApproval: true,
  execute: async ({ patches }, ctx) => {
    const service = new ProfileService(ctx.db);
    const profile = await service.getOrCreate(ctx.userId);

    if (!profile.content) {
      return {
        error:
          "Profile has no content to patch. Use updateProfile to set initial content.",
      };
    }

    let patched: string;
    try {
      patched = applyPatches(profile.content, patches);
    } catch (e) {
      if (e instanceof PatchError) {
        return { error: e.message };
      }
      throw e;
    }

    await service.update(ctx.userId, patched);
    return { success: true };
  },
});
