"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Application, ApplicationStatus } from "@prisma/client";
import { APPLICATION_STATUS_OPTIONS } from "@/components/applications/status-badge";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  MapPin,
  DollarSign,
} from "lucide-react";

type ApplicationWithRelations = Application & {
  documents: { type: string }[];
  metadata: { key: string; value: string }[];
};

type ApplicationsListProps = {
  data: ApplicationWithRelations[];
};

// The main pipeline stages (excludes terminal states)
const PIPELINE_STAGES: ApplicationStatus[] = [
  "RESEARCH",
  "DRAFT",
  "READY",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
];

const STAGE_LABELS: Record<string, string> = {
  RESEARCH: "Research",
  DRAFT: "Draft",
  READY: "Ready",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
};

function getStageIndex(status: ApplicationStatus): number {
  const idx = PIPELINE_STAGES.indexOf(status);
  return idx === -1 ? -1 : idx; // -1 for REJECTED/WITHDRAWN
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getMetaValue(
  metadata: { key: string; value: string }[],
  keys: string[],
): string | undefined {
  const lowerKeys = keys.map((k) => k.toLowerCase());
  const found = metadata.find((m) =>
    lowerKeys.some((k) => m.key.toLowerCase().includes(k)),
  );
  return found?.value;
}

function ProgressBar({ status }: { status: ApplicationStatus }) {
  const stageIdx = getStageIndex(status);
  const isTerminal = stageIdx === -1;
  const isRejected = status === "REJECTED";

  return (
    <div className="flex items-center gap-0.5">
      {PIPELINE_STAGES.map((stage, i) => {
        const isDone = !isTerminal && i < stageIdx;
        const isCurrent = !isTerminal && i === stageIdx;
        const isFuture = isTerminal || i > stageIdx;

        return (
          <div key={stage} className="flex min-w-0 flex-1 items-center gap-0.5">
            {/* Segment */}
            <div
              title={STAGE_LABELS[stage]}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                isDone && "bg-green-500",
                isCurrent && !isRejected && "bg-green-400",
                isCurrent && isRejected && "bg-red-400",
                isFuture && isRejected && i <= 2 && "bg-red-200",
                isFuture && !isRejected && "bg-muted",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

function StageLabels({ status }: { status: ApplicationStatus }) {
  const stageIdx = getStageIndex(status);
  const isTerminal = stageIdx === -1;

  return (
    <div className="flex items-center">
      {PIPELINE_STAGES.map((stage, i) => {
        const isDone = !isTerminal && i <= stageIdx;
        return (
          <div key={stage} className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-[10px] font-medium",
                isDone
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground/50",
                i === stageIdx && "text-foreground/70",
              )}
            >
              {STAGE_LABELS[stage]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        done ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
      )}
    >
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Circle className="h-3.5 w-3.5 shrink-0" />
      )}
      <span>{label}</span>
    </div>
  );
}

function StatusPill({ status }: { status: ApplicationStatus }) {
  const isRejected = status === "REJECTED";
  const isWithdrawn = status === "WITHDRAWN";
  const isOffer = status === "OFFER";
  const isInterview = status === "INTERVIEW";

  const label = STAGE_LABELS[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        isRejected &&
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        isWithdrawn && "bg-muted text-muted-foreground",
        isOffer &&
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        isInterview &&
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        !isRejected &&
          !isWithdrawn &&
          !isOffer &&
          !isInterview &&
          "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function ApplicationCard({ app }: { app: ApplicationWithRelations }) {
  const router = useRouter();
  const hasCV = app.documents.some((d) => d.type === "CV");
  const hasCoverLetter = app.documents.some((d) => d.type === "COVER_LETTER");
  const hasJobDescription = Boolean(app.jobDescription?.trim());

  const location = getMetaValue(app.metadata, ["location", "city", "remote"]);
  const salary = getMetaValue(app.metadata, ["salary", "compensation", "pay"]);
  const department = getMetaValue(app.metadata, [
    "department",
    "team",
    "division",
  ]);

  const initials = app.company
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      onClick={() => router.push(`/applications/${app.id}`)}
      className="group bg-card hover:border-ring/50 cursor-pointer rounded-2xl border p-5 transition-all duration-150 hover:shadow-sm"
    >
      <div className="flex items-start gap-4">
        {/* Logo / initials */}
        <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold select-none">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="mb-0.5 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="leading-tight font-semibold">{app.company}</span>
              <span className="text-muted-foreground mx-1.5">·</span>
              <span className="text-muted-foreground text-sm">{app.role}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusPill status={app.status} />
              <span className="text-muted-foreground text-xs">
                {formatRelativeDate(app.updatedAt)}
              </span>
            </div>
          </div>

          {/* Meta pills */}
          {(location ?? salary ?? department) && (
            <div className="mt-1 mb-3 flex items-center gap-3">
              {location && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  {location}
                </span>
              )}
              {salary && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <DollarSign className="h-3 w-3" />
                  {salary}
                </span>
              )}
              {department && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <BookOpen className="h-3 w-3" />
                  {department}
                </span>
              )}
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-3 space-y-1">
            <ProgressBar status={app.status} />
            <StageLabels status={app.status} />
          </div>

          {/* Checklist */}
          <div className="mt-3 flex items-center gap-4">
            <ChecklistItem done={hasJobDescription} label="Job description" />
            <ChecklistItem done={hasCV} label="CV" />
            <ChecklistItem done={hasCoverLetter} label="Cover letter" />
          </div>
        </div>
      </div>
    </div>
  );
}

const ALL_FILTERS = [
  { value: "", label: "All" },
  ...APPLICATION_STATUS_OPTIONS,
];

export function ApplicationsList({ data }: ApplicationsListProps) {
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = statusFilter
    ? data.filter((a) => a.status === statusFilter)
    : data;

  return (
    <div className="flex flex-col gap-4">
      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {ALL_FILTERS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              statusFilter === opt.value
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {opt.label}
            {opt.value === "" && (
              <span className="ml-1.5 text-xs opacity-60">{data.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No applications found.
          </p>
        ) : (
          filtered.map((app) => <ApplicationCard key={app.id} app={app} />)
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        {filtered.length} application{filtered.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
