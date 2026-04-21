import { db } from "@/server/db";
import { createCallerFactory } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";
import type { Session } from "@/server/better-auth/config";

/**
 * Create a tRPC caller for testing with a specific session.
 * Pass null for unauthenticated tests.
 */
export function createTestCaller(userId: string | null = null) {
  const createCaller = createCallerFactory(appRouter);
  return createCaller({
    db,
    session: userId
      ? ({
          user: { id: userId, name: "Test", email: "test@test.com" },
          session: {} as Session["session"],
        } as Session)
      : null,
    headers: new Headers(),
  });
}

/**
 * Create a test user in the database.
 */
export async function createTestUser(
  overrides: {
    id?: string;
    email?: string;
    name?: string;
  } = {},
) {
  const id =
    overrides.id ??
    `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return db.user.create({
    data: {
      id,
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `${id}@test.com`,
      emailVerified: false,
    },
  });
}

/**
 * Clean up all test data.
 */
export async function cleanDatabase() {
  await db.activity.deleteMany({});
  await db.document.deleteMany({});
  await db.applicationMeta.deleteMany({});
  await db.application.deleteMany({});
  await db.profile.deleteMany({});
  await db.session.deleteMany({});
  await db.account.deleteMany({});
  await db.verification.deleteMany({});
  await db.user.deleteMany({});
}
