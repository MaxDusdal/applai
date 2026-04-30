import {
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  Send,
  Trophy,
  type LucideIcon,
  XCircle,
  MinusCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@prisma/client";

export type StatusConfig = {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive" | "ghost";
  icon: LucideIcon;
  color: string;
  activeColor: string;
  badgeClass: string;
};

export const statusConfig: Record<ApplicationStatus, StatusConfig> = {
  RESEARCH: {
    label: "Research",
    variant: "secondary",
    icon: BookOpen,
    color: "text-muted-foreground",
    activeColor: "text-foreground",
    badgeClass: "text-muted-foreground ring-border bg-muted/60",
  },
  DRAFT: {
    label: "Draft",
    variant: "outline",
    icon: FileText,
    color: "text-muted-foreground",
    activeColor: "text-amber-600 dark:text-amber-400",
    badgeClass:
      "text-amber-600 dark:text-amber-400 ring-amber-300/50 dark:ring-amber-700/50 bg-amber-50 dark:bg-amber-950/30",
  },
  READY: {
    label: "Ready",
    variant: "secondary",
    icon: CheckCircle2,
    color: "text-muted-foreground",
    activeColor: "text-emerald-600 dark:text-emerald-400",
    badgeClass:
      "text-emerald-600 dark:text-emerald-400 ring-emerald-300/50 dark:ring-emerald-700/50 bg-emerald-50 dark:bg-emerald-950/30",
  },
  APPLIED: {
    label: "Applied",
    variant: "default",
    icon: Send,
    color: "text-muted-foreground",
    activeColor: "text-blue-600 dark:text-blue-400",
    badgeClass:
      "text-blue-600 dark:text-blue-400 ring-blue-300/50 dark:ring-blue-700/50 bg-blue-50 dark:bg-blue-950/30",
  },
  INTERVIEW: {
    label: "Interview",
    variant: "default",
    icon: Calendar,
    color: "text-muted-foreground",
    activeColor: "text-violet-600 dark:text-violet-400",
    badgeClass:
      "text-violet-600 dark:text-violet-400 ring-violet-300/50 dark:ring-violet-700/50 bg-violet-50 dark:bg-violet-950/30",
  },
  OFFER: {
    label: "Offer",
    variant: "default",
    icon: Trophy,
    color: "text-muted-foreground",
    activeColor: "text-green-600 dark:text-green-400",
    badgeClass:
      "text-green-600 dark:text-green-400 ring-green-300/50 dark:ring-green-700/50 bg-green-50 dark:bg-green-950/30",
  },
  REJECTED: {
    label: "Rejected",
    variant: "destructive",
    icon: XCircle,
    color: "text-destructive",
    activeColor: "text-destructive",
    badgeClass: "text-destructive ring-destructive/30 bg-destructive/5",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    variant: "ghost",
    icon: MinusCircle,
    color: "text-muted-foreground",
    activeColor: "text-muted-foreground",
    badgeClass: "text-muted-foreground ring-border bg-muted/60",
  },
};

type StatusBadgeProps = {
  status: ApplicationStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        config.badgeClass,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {config.label}
    </span>
  );
}

export const APPLICATION_STATUS_OPTIONS: {
  value: ApplicationStatus;
  label: string;
}[] = [
  { value: "RESEARCH", label: "Research" },
  { value: "DRAFT", label: "Draft" },
  { value: "READY", label: "Ready" },
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];
