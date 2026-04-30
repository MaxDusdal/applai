import type { db } from "@/server/db";
import type { VersionTrigger } from "@prisma/client";
import { Prisma } from "@prisma/client";

type DbClient = typeof db;

const AUTO_SNAPSHOT_GAP_MS = 5 * 60 * 1000; // 5 minutes
const MAX_VERSION_RETRIES = 3;

export class DocumentVersionService {
  constructor(private db: DbClient) {}

  async createVersion(
    documentId: string,
    data: {
      source: string;
      yamlContent?: string | null;
      trigger: VersionTrigger;
      label?: string;
    },
  ) {
    for (let attempt = 0; attempt < MAX_VERSION_RETRIES; attempt++) {
      const nextVersion = await this.getNextVersionNumber(documentId);
      try {
        return await this.db.documentVersion.create({
          data: {
            documentId,
            version: nextVersion,
            source: data.source,
            yamlContent: data.yamlContent,
            trigger: data.trigger,
            label: data.label,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          attempt < MAX_VERSION_RETRIES - 1
        ) {
          // Unique constraint violation on (documentId, version) — retry
          continue;
        }
        throw error;
      }
    }
    throw new Error("Failed to allocate version number after retries");
  }

  async listVersions(
    userId: string,
    documentId: string,
    opts?: { limit?: number; cursor?: string },
  ) {
    const doc = await this.db.document.findFirst({
      where: { id: documentId, userId },
      select: { id: true },
    });
    if (!doc) throw new Error("Not found");

    const limit = opts?.limit ?? 20;

    const versions = await this.db.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: "desc" },
      take: limit + 1,
      ...(opts?.cursor && {
        cursor: { id: opts.cursor },
        skip: 1,
      }),
      select: {
        id: true,
        version: true,
        trigger: true,
        label: true,
        createdAt: true,
      },
    });

    const hasMore = versions.length > limit;
    if (hasMore) versions.pop();

    return {
      versions,
      nextCursor: hasMore ? versions[versions.length - 1]!.id : undefined,
    };
  }

  async getVersion(userId: string, versionId: string) {
    const version = await this.db.documentVersion.findFirst({
      where: { id: versionId },
      include: { document: { select: { userId: true } } },
    });
    if (!version?.document.userId || version.document.userId !== userId)
      return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { document: _doc, ...rest } = version;
    return rest;
  }

  async restoreVersion(userId: string, versionId: string) {
    const version = await this.db.documentVersion.findFirst({
      where: { id: versionId },
      include: {
        document: {
          select: {
            id: true,
            userId: true,
            source: true,
            yamlContent: true,
            isUploadedPdf: true,
          },
        },
      },
    });
    if (!version?.document.userId || version.document.userId !== userId) {
      throw new Error("Not found");
    }
    if (version.document.isUploadedPdf) {
      throw new Error("Uploaded PDF documents cannot be edited.");
    }

    const doc = version.document;

    return this.db.$transaction(async (tx) => {
      // Snapshot current state before restoring
      const latest = await tx.documentVersion.findFirst({
        where: { documentId: doc.id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          version: (latest?.version ?? 0) + 1,
          source: doc.source,
          yamlContent: doc.yamlContent,
          trigger: "RESTORE",
          label: `Before restoring to version ${version.version}`,
        },
      });

      // Update document to restored content
      return tx.document.update({
        where: { id: doc.id },
        data: {
          source: version.source,
          yamlContent: version.yamlContent,
        },
      });
    });
  }

  async shouldAutoSnapshot(documentId: string): Promise<boolean> {
    const latest = await this.db.documentVersion.findFirst({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (!latest) return true;
    return Date.now() - latest.createdAt.getTime() > AUTO_SNAPSHOT_GAP_MS;
  }

  private async getNextVersionNumber(documentId: string): Promise<number> {
    const latest = await this.db.documentVersion.findFirst({
      where: { documentId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return (latest?.version ?? 0) + 1;
  }
}
