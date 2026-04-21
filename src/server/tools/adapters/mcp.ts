import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDefinition, ToolContext } from "../types";
import type { db } from "@/server/db";

type DbClient = typeof db;

export function registerMcpTools(
  server: McpServer,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  definitions: readonly ToolDefinition<any, any>[],
  dbClient: DbClient,
  getUserId: () => string | undefined,
) {
  for (const def of definitions) {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const { name, description, inputSchema } = def;
    server.registerTool(
      name,
      { title: name, description, inputSchema },
      async (input: Record<string, unknown>) => {
        const userId = getUserId();
        if (!userId) {
          return {
            content: [{ type: "text" as const, text: "Unauthorized" }],
            isError: true,
          };
        }

        const ctx: ToolContext = { userId, db: dbClient };
        const result = await def.execute(input, ctx);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  }
}
