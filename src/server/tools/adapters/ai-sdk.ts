import { tool, type ToolSet } from "ai";
import type { ToolDefinition, ToolContext } from "../types";

export function toAiSdkTools(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  definitions: readonly ToolDefinition<any, any>[],
  ctx: ToolContext,
): ToolSet {
  const tools: ToolSet = {};

  for (const def of definitions) {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
    tools[def.name] = tool({
      description: def.description,
      inputSchema: def.inputSchema,
      ...(def.needsApproval ? { needsApproval: true } : {}),
      execute: async (input: Record<string, unknown>) => def.execute(input, ctx),
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
  }

  return tools;
}
