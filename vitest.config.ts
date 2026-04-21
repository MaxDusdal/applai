import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

// Load .env file manually for tests
function loadDotEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, ".env");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.includes('"', 1)) ||
      (value.startsWith("'") && value.includes("'", 1))
    ) {
      const quote = value[0]!;
      value = value.slice(1, value.lastIndexOf(quote));
    }
    result[key] = value;
  }
  return result;
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    env: loadDotEnv(),
    // Run test files sequentially to avoid DB conflicts between suites
    maxWorkers: 1,
    sequence: {
      concurrent: false,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
