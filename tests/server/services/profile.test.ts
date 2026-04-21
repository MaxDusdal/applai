import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { ProfileService } from "@/server/services/profile";
import { db } from "@/server/db";
import { createTestUser, cleanDatabase } from "../../helpers/test-utils";

describe("ProfileService", () => {
  let service: ProfileService;
  let userId: string;

  beforeEach(async () => {
    await cleanDatabase();
    service = new ProfileService(db);
    const user = await createTestUser();
    userId = user.id;
  });

  afterAll(async () => {
    await cleanDatabase();
    await db.$disconnect();
  });

  it("creates a profile on getOrCreate when none exists", async () => {
    const profile = await service.getOrCreate(userId);
    expect(profile.userId).toBe(userId);
    expect(profile.content).toBe("");
  });

  it("returns existing profile on getOrCreate", async () => {
    await service.update(userId, "# My Profile");
    const profile = await service.getOrCreate(userId);
    expect(profile.content).toBe("# My Profile");
  });

  it("updates profile content", async () => {
    await service.getOrCreate(userId);
    const updated = await service.update(userId, "# Updated");
    expect(updated.content).toBe("# Updated");
  });

  it("upserts profile on update (creates if missing)", async () => {
    const profile = await service.update(userId, "# From scratch");
    expect(profile.userId).toBe(userId);
    expect(profile.content).toBe("# From scratch");
  });

  it("returns null from get when no profile exists", async () => {
    const profile = await service.get(userId);
    expect(profile).toBeNull();
  });

  it("isolates profiles between users", async () => {
    const other = await createTestUser({ id: "other-user" });
    await service.update(userId, "User A profile");
    await service.update(other.id, "User B profile");

    const a = await service.get(userId);
    const b = await service.get(other.id);
    expect(a?.content).toBe("User A profile");
    expect(b?.content).toBe("User B profile");
  });
});
