"use client";

import { useCallback, useRef, useState } from "react";
import type { ApplicationStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { statusConfig } from "./status-badge";
import { StatusActionPopover } from "./status-action-popover";
import { RotateCcw } from "lucide-react";

const PIPELINE_STAGES: ApplicationStatus[] = [
  "RESEARCH",
  "DRAFT",
  "READY",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
];

type StatusStepperProps = {
  status: ApplicationStatus;
  onChange: (status: ApplicationStatus) => void;
  disabled?: boolean;
};

export function StatusStepper({
  status,
  onChange,
  disabled,
}: StatusStepperProps) {
  const [pendingPopover, setPendingPopover] =
    useState<ApplicationStatus | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isTerminal = !PIPELINE_STAGES.includes(status);
  const currentIdx = PIPELINE_STAGES.indexOf(status);

  const handleStepClick = useCallback(
    (stage: ApplicationStatus) => {
      if (disabled || stage === status) return;
      onChange(stage);
      setPendingPopover(stage);
    },
    [disabled, status, onChange],
  );

  const handleTerminalClick = useCallback(
    (terminal: "REJECTED" | "WITHDRAWN") => {
      if (disabled || status === terminal) return;
      onChange(terminal);
      setPendingPopover(terminal);
    },
    [disabled, status, onChange],
  );

  const handleRestore = useCallback(() => {
    if (disabled) return;
    onChange("APPLIED");
    setPendingPopover(null);
  }, [disabled, onChange]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-wrap items-center gap-2"
    >
      {/* Pipeline steps */}
      <div className="flex items-center">
        {PIPELINE_STAGES.map((stage, i) => {
          const stageConfig = statusConfig[stage];
          const Icon = stageConfig.icon;

          const isPast = !isTerminal && i < currentIdx;
          const isCurrent = !isTerminal && i === currentIdx;
          const isFuture = isTerminal || i > currentIdx;
          const isDisabled = disabled;

          return (
            <div key={stage} className="flex items-center">
              {/* Connector line */}
              {i > 0 && (
                <div
                  className={cn(
                    "h-px w-3 shrink-0 transition-colors",
                    isPast || isCurrent ? "bg-border" : "bg-border/40",
                  )}
                />
              )}

              {/* Step button */}
              <button
                onClick={() => handleStepClick(stage)}
                disabled={isDisabled}
                title={
                  isCurrent ? stageConfig.label : `Move to ${stageConfig.label}`
                }
                className={cn(
                  "group focus-visible:ring-ring relative flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:outline-none",
                  !isDisabled && "cursor-pointer",
                  isDisabled && "cursor-default",
                  // Past: subtle green, clickable to revert
                  isPast &&
                    !isDisabled &&
                    "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30",
                  isPast &&
                    isDisabled &&
                    "text-emerald-600 dark:text-emerald-400",
                  // Current: highlighted with ring
                  isCurrent &&
                    cn(
                      "ring-1 ring-inset",
                      stageConfig.activeColor,
                      "bg-muted/60 ring-current/30",
                    ),
                  // Future: muted, advances on click
                  isFuture &&
                    !isDisabled &&
                    "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50",
                  isFuture && isDisabled && "text-muted-foreground/40",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 transition-colors",
                    isPast && "text-emerald-500 dark:text-emerald-400",
                    isCurrent && stageConfig.activeColor,
                    isFuture && "opacity-50",
                  )}
                />
                <span className="leading-none">{stageConfig.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Separator */}
      <div className="bg-border/50 h-4 w-px shrink-0" />

      {/* Terminal state buttons */}
      {isTerminal ? (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
              status === "REJECTED"
                ? "text-destructive ring-destructive/30 bg-destructive/5"
                : "text-muted-foreground ring-border bg-muted/60",
            )}
          >
            {(() => {
              const Icon = statusConfig[status].icon;
              return <Icon className="h-3.5 w-3.5" />;
            })()}
            {statusConfig[status].label}
          </span>
          {!disabled && (
            <button
              onClick={handleRestore}
              title="Move back to Applied"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Undo</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleTerminalClick("REJECTED")}
            disabled={disabled}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium transition-colors",
              !disabled
                ? "text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5"
                : "text-muted-foreground/40 cursor-default",
            )}
          >
            Rejected
          </button>
          <button
            onClick={() => handleTerminalClick("WITHDRAWN")}
            disabled={disabled}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium transition-colors",
              !disabled
                ? "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50"
                : "text-muted-foreground/40 cursor-default",
            )}
          >
            Withdrawn
          </button>
        </div>
      )}

      {/* Action popover */}
      {pendingPopover && (
        <StatusActionPopover
          toStatus={pendingPopover}
          onDismiss={() => setPendingPopover(null)}
        />
      )}
    </div>
  );
}
