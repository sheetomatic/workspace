import type { LeadNurtureEventId } from "@/lib/leads/nurture/templates";
import { LEAD_NURTURE_EVENT_LABELS } from "@/lib/leads/nurture/templates";

export type CrmAlertKind =
  | "payment_not_received"
  | "quotation_not_accepted"
  | "negotiation";

export type CrmAlertItem = {
  id: string;
  kind: CrmAlertKind;
  event: LeadNurtureEventId;
  leadId: string;
  leadName: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  daysOverdue: number;
  reason: string;
  anchorAt: string;
  alreadyMessaged: boolean;
};

export function alertEventForKind(kind: CrmAlertKind): LeadNurtureEventId {
  switch (kind) {
    case "payment_not_received":
      return "alert_payment_pending";
    case "quotation_not_accepted":
      return "alert_quotation_pending";
    case "negotiation":
      return "alert_negotiation";
  }
}

export function alertKindLabel(kind: CrmAlertKind) {
  return LEAD_NURTURE_EVENT_LABELS[alertEventForKind(kind)];
}
