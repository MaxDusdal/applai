import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ProfileService } from "@/server/services/profile";

export const profileRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const service = new ProfileService(ctx.db);
    return service.getOrCreate(ctx.session.user.id);
  }),

  update: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new ProfileService(ctx.db);
      return service.update(ctx.session.user.id, input.content);
    }),
});
