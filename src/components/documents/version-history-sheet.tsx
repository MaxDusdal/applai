"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RotateCcw, Bot, Clock, Save, Play, Sparkles } from "lucide-react";
import type { VersionTrigger } from "@prisma/client";

const TRIGGER_CONFIG: Record<
  VersionTrigger,
  { label: string; icon: typeof Clock; variant: "default" | "secondary" | "outline" }
> = {
  MANUAL: { label: "Manual", icon: Save, variant: "secondary" },
  AI_EDIT: { label: "AI Edit", icon: Bot, variant: "default" },
  TEMPLATE_LOAD: { label: "Template", icon: Sparkles, variant: "outline" },
  RESTORE: { label: "Restore", icon: RotateCcw, variant: "outline" },
  AUTO: { label: "Auto", icon: Clock, variant: "secondary" },
};

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function VersionHistorySheet({
  documentId,
  open,
  onOpenChange,
}: {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [restoreTarget, setRestoreTarget] = useState<{
    id: string;
    version: number;
  } | null>(null);

  const utils = api.useUtils();

  const { data, isLoading } = api.document.listVersions.useQuery(
    { documentId },
    { enabled: open },
  );

  const restoreMutation = api.document.restoreVersion.useMutation({
    onSuccess: () => {
      setRestoreTarget(null);
      void utils.document.getById.invalidate({ id: documentId });
      void utils.document.listVersions.invalidate({ documentId });
    },
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Version History</SheetTitle>
            <SheetDescription>
              Browse and restore previous versions of this document.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted h-16 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : !data?.versions.length ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No versions saved yet.
              </p>
            ) : (
              <ol className="relative ml-2 space-y-3 border-l border-border pl-4">
                {data.versions.map((v) => {
                  const config = TRIGGER_CONFIG[v.trigger];
                  const Icon = config.icon;
                  return (
                    <li key={v.id} className="relative">
                      <div className="absolute -left-[21px] mt-2 h-3 w-3 rounded-full border border-border bg-muted" />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              v{v.version}
                            </span>
                            <Badge variant={config.variant}>
                              <Icon className="mr-0.5 h-3 w-3" data-icon="inline-start" />
                              {config.label}
                            </Badge>
                          </div>
                          {v.label && (
                            <p className="text-muted-foreground mt-0.5 truncate text-xs">
                              {v.label}
                            </p>
                          )}
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {formatRelativeDate(v.createdAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={() =>
                            setRestoreTarget({ id: v.id, version: v.version })
                          }
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Restore
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore version {restoreTarget?.version}?</DialogTitle>
            <DialogDescription>
              The current document content will be saved as a new version before
              restoring. This action is reversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreTarget(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (restoreTarget) {
                  restoreMutation.mutate({ versionId: restoreTarget.id });
                }
              }}
              disabled={restoreMutation.isPending}
            >
              <Play className="mr-1 h-4 w-4" />
              {restoreMutation.isPending ? "Restoring..." : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
