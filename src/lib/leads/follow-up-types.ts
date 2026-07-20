import type { InboundLeadStatus } from "@prisma/client";
import type { LeadNurtureEventId } from "@/lib/leads/nurture/events";

/** Client-safe CRM follow-up type helpers (no server-only imports). */

export const FOLLOW_UP_TYPE_ORDER = [
  "LEAD",
  "MEETING",
  "QUOTATION",
  "NEGOTIATION",
  "PAYMENT",
] as const;

export type InboundLeadFollowUpTypeId = (typeof FOLLOW_UP_TYPE_ORDER)[number];

export const FOLLOW_UP_TYPE_LABELS: Record<InboundLeadFollowUpTypeId, string> = {
  LEAD: "Lead follow-up",
  MEETING: "Meeting follow-up",
  QUOTATION: "Quotation follow-up",
  NEGOTIATION: "Negotiation follow-up",
  PAYMENT: "Payment follow-up",
};

export const FOLLOW_UP_TYPE_TO_NURTURE_EVENT: Record<
  InboundLeadFollowUpTypeId,
  LeadNurtureEventId
> = {
  LEAD: "stage_follow_up",
  MEETING: "stage_schedule_meeting",
  QUOTATION: "alert_quotation_pending",
  NEGOTIATION: "alert_negotiation",
  PAYMENT: "alert_payment_pending",
};

/** Optional stage update when scheduling a typed follow-up. */
export const FOLLOW_UP_TYPE_TO_LEAD_STATUS: Record<
  InboundLeadFollowUpTypeId,
  InboundLeadStatus
> = {
  LEAD: "FOLLOW_UP",
  MEETING: "SCHEDULE_MEETING",
  QUOTATION: "PROPOSAL",
  NEGOTIATION: "NEGOTIATION",
  PAYMENT: "PAYMENT",
};

export function isInboundLeadFollowUpType(
  value: unknown,
): value is InboundLeadFollowUpTypeId {
  return (
    typeof value === "string" &&
    (FOLLOW_UP_TYPE_ORDER as readonly string[]).includes(value)
  );
}

export function followUpTypeLabel(
  type: InboundLeadFollowUpTypeId | string | null | undefined,
): string {
  if (isInboundLeadFollowUpType(type)) {
    return FOLLOW_UP_TYPE_LABELS[type];
  }
  return FOLLOW_UP_TYPE_LABELS.LEAD;
}

export function followUpTypeToNurtureEvent(
  type: InboundLeadFollowUpTypeId | string | null | undefined,
): LeadNurtureEventId {
  if (isInboundLeadFollowUpType(type)) {
    return FOLLOW_UP_TYPE_TO_NURTURE_EVENT[type];
  }
  return FOLLOW_UP_TYPE_TO_NURTURE_EVENT.LEAD;
}

export function followUpTypeToLeadStatus(
  type: InboundLeadFollowUpTypeId | string | null | undefined,
): InboundLeadStatus {
  if (isInboundLeadFollowUpType(type)) {
    return FOLLOW_UP_TYPE_TO_LEAD_STATUS[type];
  }
  return FOLLOW_UP_TYPE_TO_LEAD_STATUS.LEAD;
}
