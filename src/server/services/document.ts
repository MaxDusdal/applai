import type { db } from "@/server/db";
import type { DocumentType, Prisma } from "@prisma/client";
import { PdfUploadService } from "./pdf-upload";

type DbClient = typeof db;

export class DocumentService {
  constructor(private db: DbClient) {}

  async getById(userId: string, id: string) {
    return this.db.document.findFirst({
      where: { id, userId },
    });
  }

  async listByApplication(userId: string, applicationId: string) {
    return this.db.document.findMany({
      where: { applicationId, userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        type: true,
        name: true,
        source: true,
        isUploadedPdf: true,
        pdfUrl: true,
        updatedAt: true,
        createdAt: true,
        templateId: true,
        yamlContent: true,
      },
    });
  }

  async create(
    userId: string,
    applicationId: string,
    data: {
      type: DocumentType;
      name: string;
      source?: string;
      yamlContent?: string;
      templateId?: string;
      pdfUrl?: string;
      extractedText?: string;
      isUploadedPdf?: boolean;
    },
  ) {
    const app = await this.db.application.findFirst({
      where: { id: applicationId, userId },
    });
    if (!app) throw new Error("Not found");

    return this.db.document.create({
      data: {
        applicationId,
        userId,
        type: data.type,
        name: data.name,
        source: data.source ?? "",
        yamlContent: data.yamlContent,
        templateId: data.templateId,
        pdfUrl: data.pdfUrl,
        extractedText: data.extractedText,
        isUploadedPdf: data.isUploadedPdf ?? false,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    data: {
      source?: string;
      yamlContent?: string;
      chatHistory?: Prisma.InputJsonValue;
    },
  ) {
    const current = await this.db.document.findFirst({
      where: { id, userId },
      select: { source: true, isUploadedPdf: true },
    });
    if (!current) throw new Error("Not found");
    if (current.isUploadedPdf) {
      throw new Error("Uploaded PDF documents cannot be edited.");
    }

    if (data.source !== undefined) {
      return this.db.document.update({
        where: { id },
        data: {
          previousSource: current.source || null,
          source: data.source,
          ...(data.yamlContent !== undefined && {
            yamlContent: data.yamlContent,
          }),
          ...(data.chatHistory !== undefined && {
            chatHistory: data.chatHistory,
          }),
        },
      });
    }

    return this.db.document.update({
      where: { id },
      data: {
        ...(data.yamlContent !== undefined && {
          yamlContent: data.yamlContent,
        }),
        ...(data.chatHistory !== undefined && {
          chatHistory: data.chatHistory,
        }),
      },
    });
  }

  async updateName(userId: string, id: string, name: string) {
    const doc = await this.db.document.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!doc) throw new Error("Not found");
    return this.db.document.update({ where: { id }, data: { name } });
  }

  async delete(userId: string, id: string) {
    const doc = await this.db.document.findFirst({
      where: { id, userId },
      select: { pdfUrl: true },
    });
    if (doc?.pdfUrl) {
      try {
        const pdfService = new PdfUploadService();
        await pdfService.delete(doc.pdfUrl);
      } catch (e) {
        console.warn("Failed to delete blob:", e);
      }
    }
    return this.db.document.deleteMany({ where: { id, userId } });
  }
}
