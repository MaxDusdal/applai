"use client";

import { api } from "@/trpc/react";
import { FileText, File } from "lucide-react";

const DOC_TYPE_LABELS: Record<string, string> = {
  CV: "CV",
  COVER_LETTER: "Cover Letter",
  ADDITIONAL: "Additional",
};

export default function TemplatesPage() {
  const templates = api.template.list.useQuery();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Starter templates for your CVs and cover letters. Select a template
          when creating a new document from an application.
        </p>
      </div>

      {templates.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border p-5">
              <div className="bg-muted mb-3 h-5 w-32 rounded" />
              <div className="bg-muted mb-2 h-4 w-full rounded" />
              <div className="bg-muted h-4 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.data?.map((template) => (
            <div
              key={template.id}
              className="flex flex-col gap-3 rounded-xl border p-5"
            >
              <div className="flex items-start justify-between">
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                  <FileText className="text-muted-foreground h-5 w-5" />
                </div>
                <div className="flex gap-1">
                  {template.documentTypes.map((dt) => (
                    <span
                      key={dt}
                      className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium"
                    >
                      {DOC_TYPE_LABELS[dt] ?? dt}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold">{template.name}</h3>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {template.description}
                </p>
              </div>
              <div className="text-muted-foreground mt-auto flex items-center gap-1 text-xs">
                <File className="h-3 w-3" />
                <span>{template.typPath.split("/").pop()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
