import { createMcpHandler } from "mcp-handler";
import { withMcpAuth } from "better-auth/plugins";
import { AsyncLocalStorage } from "node:async_hooks";
import { db } from "@/server/db";
import { auth } from "@/server/better-auth";
import { allTools } from "@/server/tools/definitions";
import { registerMcpTools } from "@/server/tools/adapters/mcp";

const userIdStorage = new AsyncLocalStorage<string>();

const mcpHandler = createMcpHandler(
  (server) => {
    registerMcpTools(server, allTools, db, () => userIdStorage.getStore());
  },
  {},
  { basePath: "/api", maxDuration: 60 },
);

const handler = withMcpAuth(auth, (req, session) => {
  return userIdStorage.run(session.userId, () => mcpHandler(req));
});

export { handler as GET, handler as POST, handler as DELETE };
