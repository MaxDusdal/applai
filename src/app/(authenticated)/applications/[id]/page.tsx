"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { InlineInput } from "@/components/ui/inline-input";
import { Textarea } from "@/components/ui/textarea";
import { APPLICATION_STATUS_OPTIONS } from "@/components/applications/status-badge";
import { CreateDocumentDialog } from "@/components/documents/create-document-dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  FileText,
  Tags,
  FileStack,
  X,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { usePageContext } from "@/components/agent/agent-provider";
import type { ApplicationStatus } from "@prisma/client";

type SectionId = "metadata" | "job-description" | "activity" | "documents";

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: "metadata", label: "Metadata", icon: Tags },
  { id: "job-description", label: "Job Description", icon: FileText },
  { id: "activity", label: "Activity", icon: Clock },
  { id: "documents", label: "Documents", icon: FileStack },
];

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils = api.useUtils();

  usePageContext({ page: "application", applicationId: id });

  const scrollRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>(
    {},
  );
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
    metadata: null,
    "job-description": null,
    activity: null,
    documents: null,
  });
  const [activeSections, setActiveSections] = useState<Set<SectionId>>(
    new Set<SectionId>(["metadata"]),
  );
  const [barStyle, setBarStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || activeSections.size === 0) return;
    const active = SECTIONS.filter((s) => activeSections.has(s.id));
    if (active.length === 0) return;
    const first = tabRefs.current[active[0]!.id];
    const last = tabRefs.current[active[active.length - 1]!.id];
    if (!first || !last) return;
    const navRect = nav.getBoundingClientRect();
    const firstRect = first.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    setBarStyle({
      left: firstRect.left - navRect.left,
      width: lastRect.right - firstRect.left,
    });
  }, [activeSections]);

  const application = api.application.get.useQuery({ id });
  const updateMutation = api.application.update.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing fetches so they don't overwrite our optimistic value
      await utils.application.get.cancel({ id });
      const previous = utils.application.get.getData({ id });
      if (previous) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, ...fields } = variables;
        utils.application.get.setData(
          { id },
          { ...previous, ...fields, updatedAt: new Date() },
        );
      }
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        utils.application.get.setData({ id }, context.previous);
      }
    },
    onSettled: () => void utils.application.get.invalidate({ id }),
  });
  const deleteMutation = api.application.delete.useMutation({
    onSuccess: () => router.push("/dashboard"),
  });
  const createMetaMutation = api.application.createMeta.useMutation({
    onSuccess: () => void utils.application.get.invalidate({ id }),
  });
  const updateMetaMutation = api.application.updateMeta.useMutation({
    onSuccess: () => void utils.application.get.invalidate({ id }),
  });
  const deleteMetaMutation = api.application.deleteMeta.useMutation({
    onSuccess: () => void utils.application.get.invalidate({ id }),
  });

  // Track all sections currently visible in the scroll container
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setActiveSections((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            if (entry.isIntersecting) next.add(entry.target.id as SectionId);
            else next.delete(entry.target.id as SectionId);
          }
          return next;
        });
      },
      { root: container, threshold: 0 },
    );

    for (const el of Object.values(sectionRefs.current)) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [application.data]);

  function scrollToSection(sectionId: SectionId) {
    // Immediately highlight the clicked tab before scroll settles
    setActiveSections(new Set<SectionId>([sectionId]));
    const el = sectionRefs.current[sectionId];
    const container = scrollRef.current;
    if (!el || !container) return;
    const offset =
      el.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
    container.scrollTo({ top: offset - 16, behavior: "smooth" });
  }

  // ── Inline editing state ──
  const [editing, setEditing] = useState<"company" | "role" | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  function startEdit(field: "company" | "role") {
    if (!application.data) return;
    setEditing(field);
    setEditValue(application.data[field]);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  function commitEdit() {
    if (!editing || !application.data) return;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== application.data[editing]) {
      updateMutation.mutate({ id, [editing]: trimmed });
    }
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") cancelEdit();
  }

  function handleStatusChange(status: ApplicationStatus) {
    updateMutation.mutate({ id, status });
  }

  // ── Job description state ──
  const [jdEditing, setJdEditing] = useState(false);
  const [jd, setJd] = useState("");
  const jdDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    if (application.data) {
      setJd(application.data.jobDescription ?? "");
    }
  }, [application.data]);

  const handleJdChange = useCallback(
    (value: string) => {
      setJd(value);
      if (jdDebounceRef.current) clearTimeout(jdDebounceRef.current);
      jdDebounceRef.current = setTimeout(() => {
        updateMutation.mutate({ id, jobDescription: value || null });
      }, 800);
    },
    [id, updateMutation],
  );

  useEffect(() => {
    return () => {
      if (jdDebounceRef.current) clearTimeout(jdDebounceRef.current);
    };
  }, []);

  function handleAddMeta(key: string, value: string) {
    const order = application.data?.metadata.length ?? 0;
    createMetaMutation.mutate({ applicationId: id, key, value, order });
  }

  if (application.isLoading) {
    return (
      <div className="flex h-full flex-col">
        {/* Header skeleton */}
        <div className="flex shrink-0 items-center gap-3 border-b px-6 py-3">
          <div className="bg-muted h-8 w-8 animate-pulse rounded-md" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="bg-muted h-4 w-32 animate-pulse rounded" />
            <div className="bg-muted h-3 w-48 animate-pulse rounded" />
          </div>
          <div className="bg-muted h-7 w-24 animate-pulse rounded-2xl" />
        </div>

        {/* Nav skeleton */}
        <div className="flex shrink-0 gap-4 border-b px-6 py-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-muted h-4 animate-pulse rounded"
              style={{ width: `${[60, 92, 56, 76][i]}px` }}
            />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="flex-1 space-y-10 overflow-y-auto px-6 py-8">
          {/* Metadata */}
          <div className="space-y-3">
            <div className="bg-muted h-4 w-20 animate-pulse rounded" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="bg-muted h-3 w-24 animate-pulse rounded" />
                <div className="bg-muted h-3 flex-1 animate-pulse rounded" />
              </div>
            ))}
          </div>

          <hr className="border-border -mx-6" />

          {/* Job description */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="bg-muted h-4 w-32 animate-pulse rounded" />
              <div className="bg-muted h-6 w-14 animate-pulse rounded-md" />
            </div>
            <div className="bg-muted h-40 animate-pulse rounded-xl" />
          </div>

          <hr className="border-border -mx-6" />

          {/* Activity */}
          <div className="space-y-4">
            <div className="bg-muted h-4 w-16 animate-pulse rounded" />
            <div className="border-border ml-2 space-y-4 border-l pl-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
                  <div className="bg-muted h-2.5 w-24 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>

          <hr className="border-border -mx-6" />

          {/* Documents */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                <div className="bg-muted h-3 w-56 animate-pulse rounded" />
              </div>
              <div className="bg-muted h-8 w-28 animate-pulse rounded-md" />
            </div>
            <div className="-mx-6 border-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b px-6 py-3 last:border-0"
                >
                  <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
                  <div className="bg-muted h-5 w-20 animate-pulse rounded-full" />
                  <div className="bg-muted h-3 w-16 animate-pulse rounded" />
                  <div className="bg-muted h-3 w-28 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!application.data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Application not found.</p>
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Button>
      </div>
    );
  }

  const app = application.data;

  return (
    <div className="flex h-full flex-col">
      {/* Header with inline-editable company/role + status */}
      <div className="flex shrink-0 items-center gap-3 border-b px-6 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 flex-1">
            {/* Company — inline edit */}
            {editing === "company" ? (
              <InlineInput
                ref={editInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={commitEdit}
                className="text-base font-semibold"
              />
            ) : (
              <button
                onClick={() => startEdit("company")}
                className="group flex items-center gap-1.5 truncate text-left"
              >
                <span className="truncate font-semibold">{app.company}</span>
                <Pencil className="text-muted-foreground h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}

            {/* Role — inline edit */}
            {editing === "role" ? (
              <InlineInput
                ref={editInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={commitEdit}
                className="text-muted-foreground mt-0.5 text-sm"
              />
            ) : (
              <button
                onClick={() => startEdit("role")}
                className="group mt-0.5 flex items-center gap-1.5 truncate text-left"
              >
                <span className="text-muted-foreground truncate text-sm">
                  {app.role}
                </span>
                <Pencil className="text-muted-foreground h-2.5 w-2.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
          </div>

          {/* Status — inline select */}
          <select
            value={app.status}
            onChange={(e) =>
              handleStatusChange(e.target.value as ApplicationStatus)
            }
            className="bg-input/50 text-foreground focus:ring-ring/30 shrink-0 rounded-2xl border-0 px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
          >
            {APPLICATION_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            if (confirm("Delete this application?")) {
              deleteMutation.mutate({ id });
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Section nav */}
      <div
        ref={navRef}
        className="bg-background relative flex shrink-0 gap-1 border-b px-6"
      >
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSections.has(section.id);
          return (
            <button
              key={section.id}
              ref={(el) => {
                tabRefs.current[section.id] = el;
              }}
              onClick={() => scrollToSection(section.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {section.label}
            </button>
          );
        })}
        <div
          className="bg-foreground absolute bottom-0 h-0.5 transition-all duration-200"
          style={{ left: barStyle.left, width: barStyle.width }}
        />
      </div>

      {/* Scrollable content area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="space-y-12 px-6 py-8">
          {/* Metadata */}
          <section
            id="metadata"
            ref={(el) => {
              sectionRefs.current.metadata = el;
            }}
          >
            <h2 className="mb-4 text-base font-semibold">Metadata</h2>
            <div className="flex flex-col gap-2.5">
              {app.metadata.map((meta) => (
                <MetaRow
                  key={meta.id}
                  meta={meta}
                  onUpdate={(key, value) =>
                    updateMetaMutation.mutate({
                      id: meta.id,
                      applicationId: id,
                      key,
                      value,
                    })
                  }
                  onDelete={() =>
                    deleteMetaMutation.mutate({
                      id: meta.id,
                      applicationId: id,
                    })
                  }
                />
              ))}
              <NewMetaRow onAdd={handleAddMeta} />
            </div>
          </section>

          <hr className="border-border -mx-6" />

          {/* Job Description */}
          <section
            id="job-description"
            ref={(el) => {
              sectionRefs.current["job-description"] = el;
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Job Description</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setJdEditing((v) => !v)}
                className="h-7 gap-1.5 px-2 text-xs"
              >
                {jdEditing ? (
                  <>
                    <X className="h-3 w-3" />
                    Done
                  </>
                ) : (
                  <>
                    <Pencil className="h-3 w-3" />
                    Edit
                  </>
                )}
              </Button>
            </div>
            {jdEditing ? (
              <Textarea
                value={jd}
                onChange={(e) => handleJdChange(e.target.value)}
                placeholder="Paste the job description here..."
                className="min-h-[320px] resize-none font-mono text-sm"
                autoFocus
              />
            ) : jd ? (
              <div className="text-muted-foreground bg-muted/30 max-h-[400px] overflow-y-auto rounded-xl px-4 py-3 text-sm whitespace-pre-wrap">
                {jd}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No job description yet.{" "}
                <button
                  onClick={() => setJdEditing(true)}
                  className="hover:text-foreground underline underline-offset-2"
                >
                  Add one
                </button>
              </p>
            )}
          </section>

          <hr className="border-border -mx-6" />

          {/* Activity */}
          <section
            id="activity"
            ref={(el) => {
              sectionRefs.current.activity = el;
            }}
          >
            <h2 className="mb-5 text-base font-semibold">Activity</h2>
            {app.activities.length === 0 ? (
              <p className="text-muted-foreground text-sm">No activity yet.</p>
            ) : (
              <ol className="border-border relative ml-2 space-y-4 border-l pl-4">
                {app.activities.map((activity) => (
                  <li key={activity.id} className="relative">
                    <div className="border-border bg-muted absolute -left-[21px] mt-1 h-3 w-3 rounded-full border" />
                    <p className="text-sm font-medium">
                      {activity.description}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatDateTime(activity.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <hr className="border-border -mx-6" />

          {/* Documents */}
          <section
            id="documents"
            ref={(el) => {
              sectionRefs.current.documents = el;
            }}
            className="pb-16"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Documents</h2>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  Generate tailored documents for this application using AI.
                </p>
              </div>
              <NewDocumentButton
                applicationId={id}
                onCreated={() => void utils.application.get.invalidate({ id })}
              />
            </div>
            <DocumentTable applicationId={id} documents={app.documents} />
          </section>
        </div>
      </div>
    </div>
  );
}

type MetaRowProps = {
  meta: { id: string; key: string; value: string };
  onUpdate: (key: string, value: string) => void;
  onDelete: () => void;
};

function MetaRow({ meta, onUpdate, onDelete }: MetaRowProps) {
  const [editingField, setEditingField] = useState<"key" | "value" | null>(
    null,
  );
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(field: "key" | "value") {
    setEditingField(field);
    setEditValue(field === "key" ? meta.key : meta.value);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    if (!editingField) return;
    const trimmed = editValue.trim();
    if (trimmed) {
      const newKey = editingField === "key" ? trimmed : meta.key;
      const newValue = editingField === "value" ? trimmed : meta.value;
      if (newKey !== meta.key || newValue !== meta.value) {
        onUpdate(newKey, newValue);
      }
    }
    setEditingField(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditingField(null);
  }

  return (
    <div className="group flex items-baseline gap-6">
      {/* Key */}
      {editingField === "key" ? (
        <InlineInput
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          className="text-muted-foreground w-28 shrink-0 text-sm font-medium"
        />
      ) : (
        <button
          onClick={() => startEdit("key")}
          className="group/k text-muted-foreground flex w-28 shrink-0 items-center gap-1 text-left text-sm font-medium"
        >
          <span className="truncate">{meta.key}</span>
          <Pencil className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover/k:opacity-60" />
        </button>
      )}

      {/* Value */}
      {editingField === "value" ? (
        <InlineInput
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          className="flex-1 text-sm"
        />
      ) : (
        <button
          onClick={() => startEdit("value")}
          className="group/v flex flex-1 items-center gap-1 text-left text-sm"
        >
          <span className={meta.value ? "" : "text-muted-foreground/40"}>
            {meta.value || "—"}
          </span>
          <Pencil className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover/v:opacity-60" />
        </button>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function NewMetaRow({
  onAdd,
}: {
  onAdd: (key: string, value: string) => void;
}) {
  const [active, setActive] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const keyRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);

  function activate() {
    setActive(true);
    setTimeout(() => keyRef.current?.focus(), 0);
  }

  function submit() {
    if (key.trim()) {
      onAdd(key.trim(), value.trim());
    }
    setKey("");
    setValue("");
    setActive(false);
  }

  function handleKeyDown(e: React.KeyboardEvent, field: "key" | "value") {
    if (e.key === "Escape") {
      setActive(false);
      setKey("");
      setValue("");
    }
    if (e.key === "Enter") {
      if (field === "key" && key.trim()) valueRef.current?.focus();
      else submit();
    }
    if (e.key === "Tab" && field === "key") {
      e.preventDefault();
      valueRef.current?.focus();
    }
  }

  if (!active) {
    return (
      <button
        onClick={activate}
        className="text-muted-foreground/60 hover:text-muted-foreground mt-1 flex items-center gap-1.5 text-sm transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add field
      </button>
    );
  }

  return (
    <div className="flex items-baseline gap-6">
      <InlineInput
        ref={keyRef}
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, "key")}
        placeholder="Field"
        className="text-muted-foreground w-28 shrink-0 text-sm font-medium"
      />
      <InlineInput
        ref={valueRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, "value")}
        onBlur={submit}
        placeholder="Value"
        className="flex-1 text-sm"
      />
    </div>
  );
}

const DOC_TYPE_LABELS: Record<string, string> = {
  CV: "CV",
  COVER_LETTER: "Cover Letter",
  ADDITIONAL: "Additional",
};

type DocumentRow = {
  id: string;
  type: string;
  name: string | null;
  source: string;
  isUploadedPdf: boolean;
  updatedAt: Date;
  templateId: string | null;
};

function DocumentTable({
  applicationId,
  documents,
}: {
  applicationId: string;
  documents: DocumentRow[];
}) {
  if (documents.length === 0) {
    return (
      <div className="-mx-6 border-y">
        <p className="text-muted-foreground px-6 py-6 text-sm">
          No documents yet. Click &ldquo;New Document&rdquo; to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-6 border-y">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-muted-foreground px-6 py-2 text-left text-xs font-medium">
              Name
            </th>
            <th className="text-muted-foreground px-6 py-2 text-left text-xs font-medium">
              Type
            </th>
            <th className="text-muted-foreground px-6 py-2 text-left text-xs font-medium">
              Status
            </th>
            <th className="text-muted-foreground px-6 py-2 text-left text-xs font-medium">
              Last edited
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const label = doc.name ?? DOC_TYPE_LABELS[doc.type] ?? doc.type;
            const typeLabel = DOC_TYPE_LABELS[doc.type] ?? doc.type;
            const hasContent = doc.isUploadedPdf || !!doc.source;
            return (
              <tr
                key={doc.id}
                className="hover:bg-muted/40 border-b transition-colors last:border-0"
              >
                <td className="px-6 py-3">
                  <Link
                    href={`/applications/${applicationId}/documents/${doc.id}`}
                    className="font-medium hover:underline"
                  >
                    {label}
                  </Link>
                </td>
                <td className="px-6 py-3">
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                    {typeLabel}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        doc.isUploadedPdf
                          ? "bg-blue-500"
                          : hasContent
                            ? "bg-green-500"
                            : "bg-muted-foreground/30"
                      }`}
                    />
                    <span className="text-muted-foreground">
                      {doc.isUploadedPdf
                        ? "Uploaded"
                        : hasContent
                          ? "Has content"
                          : "Not started"}
                    </span>
                  </span>
                </td>
                <td className="text-muted-foreground px-6 py-3 text-xs">
                  {hasContent ? formatDateTime(doc.updatedAt) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NewDocumentButton({
  applicationId,
  onCreated,
}: {
  applicationId: string;
  onCreated: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        New Document
      </Button>
      <CreateDocumentDialog
        applicationId={applicationId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => {
          setDialogOpen(false);
          onCreated();
        }}
      />
    </>
  );
}
