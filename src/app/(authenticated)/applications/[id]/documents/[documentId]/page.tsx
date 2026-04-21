"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Group, Panel, Separator } from "react-resizable-panels";
import { api } from "@/trpc/react";
import { TypstEditor } from "@/components/documents/typst-editor";
import { PdfPreview } from "@/components/documents/pdf-preview";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  FileText,
  Code2,
  X,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePageContext } from "@/components/agent/agent-provider";

const DOC_TYPE_LABELS: Record<string, string> = {
  CV: "CV",
  COVER_LETTER: "Cover Letter",
  ADDITIONAL: "Additional",
};

type EditorTab = "template" | "data";

export default function DocumentEditorPage({
  params,
}: {
  params: Promise<{ id: string; documentId: string }>;
}) {
  const { id, documentId } = use(params);
  const router = useRouter();

  const application = api.application.get.useQuery({ id });
  const document = api.document.getById.useQuery({ id: documentId });
  const updateMutation = api.document.update.useMutation();
  const compileMutation = api.document.compile.useMutation();
  const deleteMutation = api.document.delete.useMutation({
    onSuccess: () => router.push(`/applications/${id}`),
  });

  usePageContext({
    page: "document",
    applicationId: id,
    documentId,
    documentType: document.data?.type,
  });

  const [source, setSource] = useState<string | null>(null);
  const [yamlContent, setYamlContent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("data");
  const [editorOpen, setEditorOpen] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (document.data && !initialized.current) {
      setSource(document.data.source);
      setYamlContent(document.data.yamlContent ?? null);
      initialized.current = true;
    }
  }, [document.data]);

  useEffect(() => {
    if (document.data && initialized.current) {
      setSource(document.data.source);
      setYamlContent(document.data.yamlContent ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.data?.updatedAt]);

  const handleSourceChange = useCallback(
    (newSource: string) => {
      setSource(newSource);
      if (document.data?.id) {
        updateMutation.mutate({ id: document.data.id, source: newSource });
      }
    },
    [document.data?.id, updateMutation],
  );

  const handleYamlChange = useCallback(
    (newYaml: string) => {
      setYamlContent(newYaml);
      if (document.data?.id) {
        updateMutation.mutate({ id: document.data.id, yamlContent: newYaml });
      }
    },
    [document.data?.id, updateMutation],
  );

  const handleDownload = useCallback(() => {
    const doc = document.data;
    if (!doc) return;

    // For uploaded PDFs, proxy through our authenticated API route
    if (doc.isUploadedPdf) {
      const a = window.document.createElement("a");
      a.href = `/api/documents/${doc.id}/pdf`;
      const app = application.data;
      const name = doc.name ?? DOC_TYPE_LABELS[doc.type];
      a.download = app
        ? `${app.company}_${app.role}_${name}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, "_")
        : `${name}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    compileMutation.mutate(
      { id: doc.id },
      {
        onSuccess: (base64Pdf) => {
          const bytes = Uint8Array.from(atob(base64Pdf), (c) => c.charCodeAt(0));
          const blob = new Blob([bytes], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const a = window.document.createElement("a");
          const app = application.data;
          const name = doc.name ?? DOC_TYPE_LABELS[doc.type];
          a.href = url;
          a.download = app
            ? `${app.company}_${app.role}_${name}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, "_")
            : `${name}.pdf`;
          window.document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        },
      },
    );
  }, [document.data, compileMutation, application.data]);

  if (application.isLoading || document.isLoading) {
    return (
      <div className="animate-pulse flex-1 p-6">
        <div className="bg-muted mb-4 h-8 w-48 rounded" />
        <div className="bg-muted h-64 rounded" />
      </div>
    );
  }

  if (!document.data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Document not found.</p>
        <Button
          variant="ghost"
          onClick={() => router.push(`/applications/${id}`)}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Application
        </Button>
      </div>
    );
  }

  const app = application.data;
  const doc = document.data;
  const isUploadedPdf = doc.isUploadedPdf;
  const hasYaml = yamlContent !== null && yamlContent !== "";
  const docLabel = doc.name ?? DOC_TYPE_LABELS[doc.type] ?? doc.type;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/applications/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="truncate font-semibold">{app?.company ?? "Application"}</span>
            <span className="text-muted-foreground">&middot;</span>
            <span className="text-muted-foreground truncate">{app?.role ?? ""}</span>
          </div>
          <p className="text-muted-foreground text-xs">{docLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={(!isUploadedPdf && !doc.source) || compileMutation.isPending}
          >
            <Download className="mr-1 h-4 w-4" />
            {compileMutation.isPending ? "Compiling..." : "Download PDF"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isUploadedPdf && (
                <DropdownMenuItem onClick={() => setEditorOpen((v) => !v)}>
                  {editorOpen ? (
                    <X className="mr-2 h-4 w-4" />
                  ) : (
                    <Code2 className="mr-2 h-4 w-4" />
                  )}
                  {editorOpen ? "Close editor" : "Edit files"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: doc.id })}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1">
        {isUploadedPdf ? (
          /* Uploaded PDF — read-only preview */
          <div className="flex h-full flex-col">
            <div className="bg-muted/50 flex shrink-0 items-center border-b px-3 py-1.5">
              <span className="text-muted-foreground text-xs font-medium">Preview</span>
              <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
                <FileText className="h-3 w-3" />
                Uploaded PDF
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <PdfPreview pdfUrl={`/api/documents/${doc.id}/pdf`} />
            </div>
          </div>
        ) : editorOpen ? (
          <Group orientation="horizontal" className="h-full">
            {/* Left: tabbed editor */}
            <Panel defaultSize={40} minSize={20} className="flex flex-col">
              <div className="bg-muted/50 flex shrink-0 items-center gap-1 border-b px-3 py-1">
                <button
                  onClick={() => setActiveTab("data")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    activeTab === "data"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  content.yml
                </button>
                <button
                  onClick={() => setActiveTab("template")}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    activeTab === "template"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  template.typ
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {activeTab === "data" ? (
                  hasYaml || yamlContent !== null ? (
                    <TypstEditor
                      key="yaml"
                      value={yamlContent ?? ""}
                      onChange={handleYamlChange}
                      language="yaml"
                    />
                  ) : (
                    <div className="bg-muted flex h-full items-center justify-center">
                      <p className="text-muted-foreground text-sm">
                        No data file — load a template to get started.
                      </p>
                    </div>
                  )
                ) : source !== null ? (
                  <TypstEditor
                    key="typst"
                    value={source}
                    onChange={handleSourceChange}
                    language="typst"
                  />
                ) : (
                  <div className="bg-muted flex h-full items-center justify-center">
                    <p className="text-muted-foreground text-sm">Loading...</p>
                  </div>
                )}
              </div>
            </Panel>

            <Separator className="w-1.5 cursor-col-resize bg-transparent transition-colors hover:bg-border data-[active]:bg-border" />

            {/* Right: PDF preview */}
            <Panel defaultSize={60} minSize={20} className="flex flex-col">
              <div className="bg-muted/50 flex shrink-0 items-center border-b px-3 py-1.5">
                <span className="text-muted-foreground text-xs font-medium">Preview</span>
              </div>
              <div className="min-h-0 flex-1">
                <PdfPreview source={source ?? ""} yamlContent={yamlContent ?? undefined} />
              </div>
            </Panel>
          </Group>
        ) : (
          /* Preview only — full width */
          <div className="flex h-full flex-col">
            <div className="bg-muted/50 flex shrink-0 items-center border-b px-3 py-1.5">
              <span className="text-muted-foreground text-xs font-medium">Preview</span>
              {doc.templateId && (
                <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
                  <FileText className="h-3 w-3" />
                  {doc.templateId}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1">
              <PdfPreview source={source ?? ""} yamlContent={yamlContent ?? undefined} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
