import type { db } from "@/server/db";

type DbClient = typeof db;

export class ProfileService {
  constructor(private db: DbClient) {}

  async get(userId: string) {
    return this.db.profile.findUnique({ where: { userId } });
  }

  async getOrCreate(userId: string) {
    const existing = await this.db.profile.findUnique({ where: { userId } });
    if (existing) return existing;

    return this.db.profile.create({
      data: { userId, content: "" },
    });
  }

  async update(userId: string, content: string) {
    return this.db.profile.upsert({
      where: { userId },
      update: { content },
      create: { userId, content },
    });
  }
}
