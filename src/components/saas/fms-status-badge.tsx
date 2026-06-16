type FmsBadgeStatus =
  | "DRAFT"
  | "ACTIVE"
  | "ARCHIVED"
  | "COMPLETED"
  | "CANCELLED"
  | "PENDING"
  | "IN_PROGRESS"
  | "DONE"
  | "SKIPPED";

const BADGE_CLASS: Record<FmsBadgeStatus, string> = {
  DRAFT: "ws-sf-badge ws-sf-badge-neutral",
  ACTIVE: "ws-sf-badge ws-sf-badge-info",
  ARCHIVED: "ws-sf-badge ws-sf-badge-neutral",
  COMPLETED: "ws-sf-badge status-completed",
  CANCELLED: "ws-sf-badge ws-sf-badge-danger",
  PENDING: "ws-sf-badge ws-sf-badge-neutral",
  IN_PROGRESS: "ws-sf-badge ws-sf-badge-info",
  DONE: "ws-sf-badge status-completed",
  SKIPPED: "ws-sf-badge ws-sf-badge-warning",
};

const BADGE_LABEL: Record<FmsBadgeStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  SKIPPED: "Skipped",
};

export function FmsStatusBadge({ status }: { status: FmsBadgeStatus | string }) {
  const key = status as FmsBadgeStatus;
  const className = BADGE_CLASS[key] ?? "ws-sf-badge ws-sf-badge-neutral";
  const label = BADGE_LABEL[key] ?? status.replaceAll("_", " ").toLowerCase();

  return <span className={className}>{label}</span>;
}
