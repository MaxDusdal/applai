import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TemplateService } from "@/server/services/template";

export const templateRouter = createTRPCRouter({
  list: protectedProcedure.query(() => {
    const service = new TemplateService();
    return service.list();
  }),

  listByType: protectedProcedure
    .input(z.object({ type: z.enum(["CV", "COVER_LETTER", "ADDITIONAL"]) }))
    .query(({ input }) => {
      const service = new TemplateService();
      return service.listByType(input.type);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const service = new TemplateService();
      return service.getById(input.id);
    }),

  getContent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const service = new TemplateService();
      return service.getContent(input.id);
    }),
});
