import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const postRouter = createTRPCRouter({
  hello: publicProcedure.query(() => {
    return { greeting: "Hello from Apply AI" };
  }),
});
