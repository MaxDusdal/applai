import { postRouter } from "@/server/api/routers/post";
import { profileRouter } from "@/server/api/routers/profile";
import { applicationRouter } from "@/server/api/routers/application";
import { documentRouter } from "@/server/api/routers/document";
import { templateRouter } from "@/server/api/routers/template";
import { chatRouter } from "@/server/api/routers/chat";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  profile: profileRouter,
  application: applicationRouter,
  document: documentRouter,
  template: templateRouter,
  chat: chatRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
