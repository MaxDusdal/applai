"use client";

import { useRef, useState, useCallback } from "react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Plus, X, Globe, FileUp, Type } from "lucide-react";

type InputMode = "text" | "url" | "pdf";

type ParseResult = {
  company: string;
  role: string;
  jobDescription: string;
  domain?: string;
  metadata: { key: string; value: string }[];
};

type NewApplicationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewApplicationDialog({
  open,
  onOpenChange,
}: NewApplicationDialogProps) {
  const utils = api.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [pdfBase64, setPdfBase64] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Parsed result the user reviews before creating
  const [parsed, setParsed] = useState<ParseResult | null>(null);

  const parseMutation = api.application.parseJobDescription.useMutation({
    onSuccess: (result) => setParsed(result),
  });

  const createMutation = api.application.createWithMeta.useMutation({
    onSuccess: () => {
      void utils.application.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
  });

  function resetForm() {
    setText("");
    setUrl("");
    setFileName("");
    setPdfBase64("");
    setParsed(null);
  }

  function handleParse() {
    if (mode === "text" && text.trim().length >= 10) {
      parseMutation.mutate({ text: text.trim() });
    } else if (mode === "url" && url.trim()) {
      parseMutation.mutate({ url: url.trim() });
    } else if (mode === "pdf" && pdfBase64) {
      parseMutation.mutate({ pdfBase64 });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    loadFile(file);
  }

  function loadFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix to get raw base64
      const base64 = result.split(",")[1] ?? result;
      setPdfBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (
      file &&
      (file.type === "application/pdf" || file.name.endsWith(".pdf"))
    ) {
      loadFile(file);
    }
  }, []);

  function canParse(): boolean {
    if (parseMutation.isPending) return false;
    if (mode === "text") return text.trim().length >= 10;
    if (mode === "url") return url.trim().length > 0;
    if (mode === "pdf") return !!pdfBase64;
    return false;
  }

  function handleCreate() {
    if (!parsed) return;
    createMutation.mutate({
      company: parsed.company,
      role: parsed.role,
      jobDescription: parsed.jobDescription || undefined,
      domain: parsed.domain,
      metadata: parsed.metadata.length > 0 ? parsed.metadata : undefined,
    });
  }

  function updateParsed(updates: Partial<ParseResult>) {
    if (!parsed) return;
    setParsed({ ...parsed, ...updates });
  }

  function updateMeta(index: number, field: "key" | "value", val: string) {
    if (!parsed) return;
    setParsed({
      ...parsed,
      metadata: parsed.metadata.map((entry, i) =>
        i === index ? { ...entry, [field]: val } : entry,
      ),
    });
  }

  function removeMeta(index: number) {
    if (!parsed) return;
    setParsed({
      ...parsed,
      metadata: parsed.metadata.filter((_, i) => i !== index),
    });
  }

  function addMetaRow() {
    if (!parsed) return;
    setParsed({
      ...parsed,
      metadata: [...parsed.metadata, { key: "", value: "" }],
    });
  }

  const INPUT_MODES: {
    id: InputMode;
    label: string;
    icon: React.ElementType;
  }[] = [
    { id: "text", label: "Text", icon: Type },
    { id: "url", label: "URL", icon: Globe },
    { id: "pdf", label: "PDF", icon: FileUp },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Application</DialogTitle>
        </DialogHeader>

        {!parsed ? (
          /* ── Step 1: Input + Parse ── */
          <div className="flex flex-col gap-4">
            {/* Mode switcher */}
            <div className="bg-muted flex gap-1 rounded-lg p-1">
              {INPUT_MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Text input */}
            {mode === "text" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Job Description</label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={8}
                  className="resize-none text-sm"
                  autoFocus
                />
              </div>
            )}

            {/* URL input */}
            {mode === "url" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Job Posting URL</label>
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://careers.example.com/job/123"
                  autoFocus
                />
                <p className="text-muted-foreground text-xs">
                  The page will be fetched and job details extracted.
                </p>
              </div>
            )}

            {/* PDF upload */}
            {mode === "pdf" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Job Description PDF
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-border flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-sm transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5 text-primary"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <FileUp
                    className={`h-6 w-6 ${isDragging ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <span>
                    {fileName
                      ? fileName
                      : isDragging
                        ? "Drop PDF here"
                        : "Click to select or drag & drop a PDF"}
                  </span>
                </button>
              </div>
            )}

            {parseMutation.error && (
              <p className="text-destructive text-xs">
                {parseMutation.error.message}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleParse}
                disabled={!canParse()}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {parseMutation.isPending ? "Parsing..." : "Parse with AI"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ── Step 2: Review + Create ── */
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Review the extracted details and create the application.
            </p>

            {/* Company */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Company</label>
              <Input
                value={parsed.company}
                onChange={(e) => updateParsed({ company: e.target.value })}
              />
            </div>

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Role</label>
              <Input
                value={parsed.role}
                onChange={(e) => updateParsed({ role: e.target.value })}
              />
            </div>

            {/* Metadata */}
            {parsed.metadata.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Details</label>
                <div className="flex flex-col gap-2">
                  {parsed.metadata.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={entry.key}
                        onChange={(e) => updateMeta(i, "key", e.target.value)}
                        placeholder="Key"
                        className="w-36 text-sm"
                      />
                      <Input
                        value={entry.value}
                        onChange={(e) => updateMeta(i, "value", e.target.value)}
                        placeholder="Value"
                        className="flex-1 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeMeta(i)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={addMetaRow}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add field
            </Button>

            {createMutation.error && (
              <p className="text-destructive text-xs">
                {createMutation.error.message}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setParsed(null)}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={
                  !parsed.company.trim() ||
                  !parsed.role.trim() ||
                  createMutation.isPending
                }
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
