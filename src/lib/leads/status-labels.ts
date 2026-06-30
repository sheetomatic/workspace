import type { InboundLeadStatus, LeadCallingStatus, LeadProjectStatus } from "@prisma/client";

export const LEAD_STATUS_LABELS: Record<InboundLeadStatus, string> = {
  NEW: "New",
  SCHEDULE_MEETING: "Schedule meeting",
  MEETING_NOTES: "Meeting notes",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow-up",
  QUALIFIED: "Qualified",
  PROPOSAL_INVOICE: "Proposal / Invoice",
  PAYMENT: "Payment",
  PROJECT_ACTIVE: "Project active",
  WON: "Won",
  LOST: "Lost",
};

export const LEAD_STATUS_ORDER: InboundLeadStatus[] = [
  "NEW",
  "SCHEDULE_MEETING",
  "MEETING_NOTES",
  "CONTACTED",
  "FOLLOW_UP",
  "QUALIFIED",
  "PROPOSAL_INVOICE",
  "PAYMENT",
  "PROJECT_ACTIVE",
  "WON",
  "LOST",
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

export function leadStatusLabel(status: InboundLeadStatus) {
  return LEAD_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}
