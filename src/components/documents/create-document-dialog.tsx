"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, Upload, X, File } from "lucide-react";

type Mode = "choose" | "template" | "upload";
type DocType = "CV" | "COVER_LETTER" | "ADDITIONAL";

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: "CV", label: "CV" },
  { value: "COVER_LETTER", label: "Cover Letter" },
  { value: "ADDITIONAL", label: "Additional" },
];

const DEFAULT_NAMES: Record<DocType, string> = {
  CV: "CV",
  COVER_LETTER: "Cover Letter",
  ADDITIONAL: "Document",
};

type CreateDocumentDialogProps = {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function CreateDocumentDialog({
  applicationId,
  open,
  onOpenChange,
  onCreated,
}: CreateDocumentDialogProps) {
  const [mode, setMode] = useState<Mode>("choose");
  const [docType, setDocType] = useState<DocType>("CV");
  const [name, setName] = useState<string>("CV");
  const [templateId, setTemplateId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setMode("choose");
      setDocType("CV");
      setName("CV");
      setTemplateId("");
      setSelectedFile(null);
      setIsDragging(false);
    }
  }, [open]);

  // Sync name with type when user hasn't manually changed it
  const nameMatchesDefault = useRef(true);
  const handleTypeChange = (value: DocType) => {
    setDocType(value);
    if (nameMatchesDefault.current) {
      setName(DEFAULT_NAMES[value]);
    }
  };
  const handleNameChange = (value: string) => {
    setName(value);
    nameMatchesDefault.current = value === DEFAULT_NAMES[docType];
  };

  const templates = api.template.listByType.useQuery(
    { type: docType },
    { enabled: open && mode === "template" },
  );
  const templateList = useMemo(() => templates.data ?? [], [templates.data]);

  useEffect(() => {
    const first = templateList[0];
    if (first && !templateId) setTemplateId(first.id);
  }, [templateList, templateId]);

  // Reset template when type changes
  useEffect(() => {
    setTemplateId("");
  }, [docType]);

  const createMutation = api.document.createFromTemplate.useMutation({
    onSuccess: () => onCreated(),
  });
  const uploadMutation = api.document.upload.useMutation({
    onSuccess: () => onCreated(),
  });

  function handleCreate() {
    if (!templateId || !name.trim()) return;
    createMutation.mutate({ applicationId, type: docType, name: name.trim(), templateId });
  }

  function handleUpload() {
    if (!selectedFile || !name.trim()) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Strip "data:application/pdf;base64," prefix
      const base64 = dataUrl.split(",")[1];
      if (!base64) return;
      uploadMutation.mutate({
        applicationId,
        type: docType,
        name: name.trim(),
        pdfBase64: base64,
      });
    };
    reader.readAsDataURL(selectedFile);
  }

  function handleFileSelect(file: File | null) {
    if (file?.type !== "application/pdf") return;
    setSelectedFile(file);
    // Auto-fill name from filename if still default
    if (nameMatchesDefault.current) {
      const stem = file.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");
      setName(stem);
      nameMatchesDefault.current = false;
    }
  }

  const isPending = createMutation.isPending || uploadMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Document</DialogTitle>
        </DialogHeader>

        {mode === "choose" && (
          <div className="grid grid-cols-2 gap-3 py-2">
            <button
              onClick={() => setMode("template")}
              className="flex flex-col items-center gap-3 rounded-xl border p-5 text-left transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2"
            >
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                <FileText className="text-muted-foreground h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">From Template</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Start from a Typst template
                </p>
              </div>
            </button>
            <button
              onClick={() => setMode("upload")}
              className="flex flex-col items-center gap-3 rounded-xl border p-5 text-left transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2"
            >
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                <Upload className="text-muted-foreground h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Upload PDF</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Upload an existing PDF file
                </p>
              </div>
            </button>
          </div>
        )}

        {mode === "template" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select value={docType} onValueChange={(v) => handleTypeChange(v! as DocType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. CV for Google"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Template</label>
              <Select value={templateId} onValueChange={(v) => setTemplateId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templateList.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templateList.find((t) => t.id === templateId)?.description && (
                <p className="text-muted-foreground text-xs">
                  {templateList.find((t) => t.id === templateId)?.description}
                </p>
              )}
              {templateList.length === 0 && !templates.isLoading && (
                <p className="text-muted-foreground text-xs">
                  No templates available for this document type.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMode("choose")}>
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!templateId || !name.trim() || isPending}
              >
                {isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {mode === "upload" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select value={docType} onValueChange={(v) => handleTypeChange(v! as DocType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Portfolio"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">PDF File</label>
              {selectedFile ? (
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <File className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm">{selectedFile.name}</span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0] ?? null;
                    handleFileSelect(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                  }`}
                >
                  <Upload className="text-muted-foreground h-6 w-6" />
                  <p className="text-muted-foreground text-sm">
                    Drag & drop a PDF or{" "}
                    <span className="text-foreground font-medium">browse</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Max 10 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMode("choose")}>
                Back
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !name.trim() || isPending}
              >
                {isPending ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
