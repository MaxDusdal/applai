export type TemplateConfig = {
  id: string;
  name: string;
  description: string;
  documentTypes: ("CV" | "COVER_LETTER" | "ADDITIONAL")[];
  typPath: string;
  yamlPath: string;
};

export const templates: TemplateConfig[] = [
  {
    id: "modern-cv",
    name: "Academic CV",
    description:
      "Clean serif layout with education, experience, skills, volunteering, and languages.",
    documentTypes: ["CV"],
    typPath: "templates/modern-cv/template.typ",
    yamlPath: "templates/modern-cv/content.yml",
  },
  {
    id: "cover-letter",
    name: "Cover Letter",
    description:
      "Classic business letter format with sender/recipient header, date, subject line, and body paragraphs.",
    documentTypes: ["COVER_LETTER"],
    typPath: "templates/cover-letter/template.typ",
    yamlPath: "templates/cover-letter/content.yml",
  },
];
