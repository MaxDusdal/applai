"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ApplicationStatus } from "@prisma/client";
import { statusConfig } from "./status-badge";
import { cn } from "@/lib/utils";

type SuggestedAction = {
  label: string;
  description: string;
};

const SUGGESTED_ACTIONS: Partial<Record<ApplicationStatus, SuggestedAction[]>> = {
  DRAFT: [
    { label: "Generate CV", description: "Create a tailored CV for this role" },
    { label: "Generate cover letter", description: "Write a matching cover letter" },
  ],
  READY: [
    { label: "Review checklist", description: "Make sure all documents are ready" },
  ],
  APPLIED: [
    { label: "Log applied date", description: "Record when you submitted" },
    { label: "Set follow-up reminder", description: "Remind yourself to follow up" },
  ],
  INTERVIEW: [
    { label: "Generate interview prep", description: "Get common questions and tips" },
    { label: "Add interview date", description: "Log the interview time in metadata" },
  ],
  OFFER: [
    { label: "Log offer details", description: "Record salary and start date" },
    { label: "Compare offers", description: "Weigh this against other offers" },
  ],
  REJECTED: [
    { label: "Note rejection reason", description: "Reflect on what to improve" },
  ],
  WITHDRAWN: [
    { label: "Archive application", description: "Move it out of your active pipeline" },
  ],
};

type StatusActionPopoverProps = {
  toStatus: ApplicationStatus;
  onDismiss: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
};

export function StatusActionPopover({
  toStatus,
  onDismiss,
  anchorRef,
}: StatusActionPopoverProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const config = statusConfig[toStatus];
  const actions = SUGGESTED_ACTIONS[toStatus] ?? [];
  const Icon = config.icon;

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timerRef.current);
  }, [onDismiss]);

  if (actions.length === 0) return null;

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border bg-popover p-3 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-150">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-6 w-6 items-center justify-center rounded-md bg-muted", config.activeColor)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-medium">Moved to {config.label}</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {actions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground mb-1.5">Suggested next steps</p>
          {actions.map((action) => (
            <button
              key={action.label}
              disabled
              className="w-full text-left rounded-lg px-2.5 py-2 text-xs border border-dashed border-border text-muted-foreground cursor-not-allowed flex items-center justify-between gap-2"
            >
              <div>
                <span className="font-medium block">{action.label}</span>
                <span className="text-muted-foreground/70">{action.description}</span>
              </div>
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] bg-muted font-medium">
                Soon
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
