import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@prisma/client";

const statusConfig: Record<
  ApplicationStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "ghost" }
> = {
  RESEARCH: { label: "Research", variant: "secondary" },
  DRAFT: { label: "Draft", variant: "outline" },
  READY: { label: "Ready", variant: "secondary" },
  APPLIED: { label: "Applied", variant: "default" },
  INTERVIEW: { label: "Interview", variant: "default" },
  OFFER: { label: "Offer", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  WITHDRAWN: { label: "Withdrawn", variant: "ghost" },
};

type StatusBadgeProps = {
  status: ApplicationStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export const APPLICATION_STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "RESEARCH", label: "Research" },
  { value: "DRAFT", label: "Draft" },
  { value: "READY", label: "Ready" },
  { value: "APPLIED", label: "Applied" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];
