import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  createTestCaller,
  createTestUser,
  cleanDatabase,
} from "../../../helpers/test-utils";
import { db } from "@/server/db";

describe("profileRouter", () => {
  let userId: string;

  beforeEach(async () => {
    await cleanDatabase();
    const user = await createTestUser();
    userId = user.id;
  });

  afterAll(async () => {
    await cleanDatabase();
    await db.$disconnect();
  });

  it("gets or creates a profile", async () => {
    const caller = createTestCaller(userId);
    const profile = await caller.profile.get();
    expect(profile.userId).toBe(userId);
    expect(profile.content).toBe("");
  });

  it("updates profile content", async () => {
    const caller = createTestCaller(userId);
    await caller.profile.update({ content: "# My Profile" });
    const profile = await caller.profile.get();
    expect(profile.content).toBe("# My Profile");
  });

  it("rejects unauthenticated requests", async () => {
    const caller = createTestCaller(null);
    await expect(caller.profile.get()).rejects.toThrow("UNAUTHORIZED");
  });
});
