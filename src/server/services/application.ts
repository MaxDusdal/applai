import type { db } from "@/server/db";
import type { ApplicationStatus, ApplicationType } from "@prisma/client";

type DbClient = typeof db;

export class ApplicationService {
  constructor(private db: DbClient) {}

  async list(userId: string) {
    return this.db.application.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        documents: { select: { type: true, name: true } },
        metadata: {
          select: { key: true, value: true },
          orderBy: { order: "asc" },
          take: 6,
        },
      },
    });
  }

  async get(userId: string, id: string) {
    return this.db.application.findFirst({
      where: { id, userId },
      include: {
        metadata: { orderBy: { order: "asc" } },
        documents: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            name: true,
            source: true,
            yamlContent: true,
            templateId: true,
            pdfUrl: true,
            isUploadedPdf: true,
            createdAt: true,
            updatedAt: true,
            applicationId: true,
            userId: true,
          },
        },
        activities: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async create(
    userId: string,
    data: {
      company: string;
      role: string;
      type?: ApplicationType;
      jobDescription?: string;
    },
  ) {
    return this.db.application.create({
      data: {
        userId,
        company: data.company,
        role: data.role,
        type: data.type ?? "EXTERNAL",
        jobDescription: data.jobDescription,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    data: {
      company?: string;
      role?: string;
      status?: ApplicationStatus;
      type?: ApplicationType;
      jobDescription?: string | null;
    },
  ) {
    return this.db.application.updateMany({
      where: { id, userId },
      data,
    });
  }

  async delete(userId: string, id: string) {
    return this.db.application.deleteMany({
      where: { id, userId },
    });
  }

  // Create a new meta entry
  async createMeta(
    userId: string,
    applicationId: string,
    key: string,
    value: string,
    order: number,
  ) {
    const app = await this.db.application.findFirst({
      where: { id: applicationId, userId },
    });
    if (!app) throw new Error("Not found");

    return this.db.applicationMeta.create({
      data: { applicationId, key, value, order },
    });
  }

  // Update an existing meta entry
  async updateMeta(
    userId: string,
    metaId: string,
    applicationId: string,
    key: string,
    value: string,
  ) {
    const app = await this.db.application.findFirst({
      where: { id: applicationId, userId },
    });
    if (!app) throw new Error("Not found");

    return this.db.applicationMeta.updateMany({
      where: { id: metaId, applicationId },
      data: { key, value },
    });
  }

  async deleteMeta(userId: string, metaId: string, applicationId: string) {
    const app = await this.db.application.findFirst({
      where: { id: applicationId, userId },
    });
    if (!app) throw new Error("Not found");

    return this.db.applicationMeta.deleteMany({
      where: { id: metaId, applicationId },
    });
  }

  async createWithMeta(
    userId: string,
    data: {
      company: string;
      role: string;
      type?: ApplicationType;
      jobDescription?: string;
      metadata?: { key: string; value: string }[];
    },
  ) {
    return this.db.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          userId,
          company: data.company,
          role: data.role,
          type: data.type ?? "EXTERNAL",
          jobDescription: data.jobDescription,
        },
      });

      if (data.metadata && data.metadata.length > 0) {
        await tx.applicationMeta.createMany({
          data: data.metadata.map((m, i) => ({
            applicationId: app.id,
            key: m.key,
            value: m.value,
            order: i,
          })),
        });
      }

      return app;
    });
  }
}
