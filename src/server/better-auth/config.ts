import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { mcp } from "better-auth/plugins";

import { db } from "@/server/db";
import { env } from "@/env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: [env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    mcp({
      loginPage: "/",
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
