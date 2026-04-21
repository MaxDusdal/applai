import type { db } from "@/server/db";
import type { UIMessage } from "ai";

type DbClient = typeof db;

export class ChatService {
  constructor(private db: DbClient) {}

  /** List chats for a user — omits messages for cheap list queries */
  async list(userId: string) {
    return this.db.chat.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        modelId: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async get(userId: string, id: string) {
    return this.db.chat.findFirst({
      where: { id, userId },
    });
  }

  async create(userId: string, data?: { modelId?: string }) {
    return this.db.chat.create({
      data: {
        userId,
        modelId: data?.modelId,
      },
    });
  }

  async rename(userId: string, id: string, title: string) {
    return this.db.chat.updateMany({
      where: { id, userId },
      data: { title },
    });
  }

  async delete(userId: string, id: string) {
    return this.db.chat.deleteMany({
      where: { id, userId },
    });
  }

  async saveMessages(userId: string, id: string, messages: UIMessage[]) {
    return this.db.chat.updateMany({
      where: { id, userId },
      data: { messages: messages as object[] },
    });
  }

  async setModelId(userId: string, id: string, modelId: string) {
    return this.db.chat.updateMany({
      where: { id, userId },
      data: { modelId },
    });
  }

  /** Only updates title when the row still has no title — safe from user rename clobber */
  async setTitleIfEmpty(userId: string, id: string, title: string) {
    return this.db.chat.updateMany({
      where: { id, userId, title: null },
      data: { title: title.slice(0, 60) },
    });
  }
}
