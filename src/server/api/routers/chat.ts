import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ChatService } from "@/server/services/chat";

export const chatRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const service = new ChatService(ctx.db);
    return service.list(ctx.session.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new ChatService(ctx.db);
      return service.get(ctx.session.user.id, input.id);
    }),

  create: protectedProcedure
    .input(z.object({ modelId: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const service = new ChatService(ctx.db);
      return service.create(ctx.session.user.id, input ?? {});
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const service = new ChatService(ctx.db);
      return service.rename(ctx.session.user.id, input.id, input.title);
    }),

  setModel: protectedProcedure
    .input(z.object({ id: z.string(), modelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new ChatService(ctx.db);
      return service.setModelId(ctx.session.user.id, input.id, input.modelId);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new ChatService(ctx.db);
      return service.delete(ctx.session.user.id, input.id);
    }),
});
