import type { z } from "zod";
import type { db } from "@/server/db";

export type ToolContext = {
  userId: string;
  db: typeof db;
};

export interface ToolDefinition<
  TInput extends z.ZodTypeAny = z.ZodTypeAny,
  TOutput = unknown,
> {
  name: string;
  description: string;
  inputSchema: TInput;
  needsApproval?: boolean;
  execute: (input: z.infer<TInput>, ctx: ToolContext) => Promise<TOutput>;
}

export function defineTool<
  TInput extends z.ZodTypeAny,
  TOutput = unknown,
>(definition: ToolDefinition<TInput, TOutput>) {
  return definition;
}
