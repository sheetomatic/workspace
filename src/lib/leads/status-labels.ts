import type { InboundLeadStatus, LeadCallingStatus, LeadProjectStatus } from "@prisma/client";

export const LEAD_STATUS_LABELS: Record<InboundLeadStatus, string> = {
  NEW: "New",
  SCHEDULE_MEETING: "Schedule meeting",
  MEETING_NOTES: "Meeting notes",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow-up",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  INVOICE: "Invoice",
  PAYMENT: "Payment",
  PROJECT_ACTIVE: "Project active",
  WON: "Won",
  LOST: "Lost",
};

/** @deprecated Combined stage — migrated to PROPOSAL in the database. */
const LEGACY_LEAD_STATUS_LABELS: Record<string, string> = {
  PROPOSAL_INVOICE: "Proposal",
};

export const LEAD_STATUS_ORDER: InboundLeadStatus[] = [
  "NEW",
  "SCHEDULE_MEETING",
  "MEETING_NOTES",
  "CONTACTED",
  "FOLLOW_UP",
  "QUALIFIED",
  "PROPOSAL",
  "INVOICE",
  "PAYMENT",
  "PROJECT_ACTIVE",
  "WON",
  "LOST",
];

export const OPEN_LEAD_STATUSES: InboundLeadStatus[] = [
  "NEW",
  "SCHEDULE_MEETING",
  "MEETING_NOTES",
  "CONTACTED",
  "FOLLOW_UP",
  "QUALIFIED",
  "PROPOSAL",
  "INVOICE",
  "PAYMENT",
  "PROJECT_ACTIVE",
];

export const CALLING_STATUS_LABELS: Record<LeadCallingStatus, string> = {
  NOT_CALLED: "Not called",
  CALLING: "Calling…",
  NO_ANSWER: "No answer",
  CONNECTED: "Connected",
  NOT_INTERESTED: "Not interested",
};

export const PROJECT_STATUS_LABELS: Record<LeadProjectStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function migrateLegacyLeadStatus(
  status: string | null | undefined,
): InboundLeadStatus | null {
  if (!status) {
    return null;
  }
  if (status === "PROPOSAL_INVOICE") {
    return "PROPOSAL";
  }
  if (status in LEAD_STATUS_LABELS) {
    return status as InboundLeadStatus;
  }
  return null;
}

export function resolveLeadStatus(status: InboundLeadStatus | string): InboundLeadStatus {
  return migrateLegacyLeadStatus(status) ?? "NEW";
}

export function leadStatusLabel(status: InboundLeadStatus | string) {
  const resolved = migrateLegacyLeadStatus(status);
  if (resolved) {
    return LEAD_STATUS_LABELS[resolved];
  }
  return LEGACY_LEAD_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export function listLeadStatusOptions(): Array<{ id: InboundLeadStatus; label: string }> {
  return LEAD_STATUS_ORDER.map((id) => ({
    id,
    label: LEAD_STATUS_LABELS[id],
  }));
}
