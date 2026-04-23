import { readFile } from "fs/promises";
import path from "path";
import { templates, type TemplateConfig } from "../../../templates/config";

export class TemplateService {
  list(): TemplateConfig[] {
    return templates;
  }

  listByType(
    documentType: "CV" | "COVER_LETTER" | "ADDITIONAL",
  ): TemplateConfig[] {
    return templates.filter((t) => t.documentTypes.includes(documentType));
  }

  getById(id: string): TemplateConfig | null {
    return templates.find((t) => t.id === id) ?? null;
  }

  async getTypContent(templateId: string): Promise<string> {
    const template = this.getById(templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);
    const filePath = path.resolve(process.cwd(), template.typPath);
    return readFile(filePath, "utf-8");
  }

  async getYamlContent(templateId: string): Promise<string> {
    const template = this.getById(templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);
    const filePath = path.resolve(process.cwd(), template.yamlPath);
    return readFile(filePath, "utf-8");
  }

  /** @deprecated use getTypContent */
  async getContent(templateId: string): Promise<string> {
    return this.getTypContent(templateId);
  }
}
