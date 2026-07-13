import type { InboundLeadStatus } from "@prisma/client";

/** Event-driven nurture + commercial alerts — shared IDs (no prisma / no config cycle). */
export type LeadNurtureEventId =
  | "welcome"
  | "assigned"
  | "post_call"
  | "stage_schedule_meeting"
  | "stage_proposal"
  | "stage_follow_up"
  | "stage_qualified"
  | "alert_payment_pending"
  | "alert_quotation_pending"
  | "alert_negotiation";

export const LEAD_NURTURE_EVENT_LABELS: Record<LeadNurtureEventId, string> = {
  welcome: "Welcome — inquiry received",
  assigned: "Assigned — counsellor will call",
  post_call: "After call — discussion recap",
  stage_schedule_meeting: "Stage — schedule meeting",
  stage_proposal: "Stage — proposal shared",
  stage_follow_up: "Stage — follow-up reminder",
  stage_qualified: "Stage — qualified / next steps",
  alert_payment_pending: "Alert — payment not received",
  alert_quotation_pending: "Alert — quotation not accepted yet",
  alert_negotiation: "Alert — negotiation follow-up",
};

/** Min hours between stage-wise / alert messages so we do not irritate the lead. */
export const STAGE_NURTURE_MIN_GAP_HOURS = 48;

export const STATUS_TO_NURTURE_EVENT: Partial<
  Record<InboundLeadStatus, LeadNurtureEventId>
> = {
  SCHEDULE_MEETING: "stage_schedule_meeting",
  DEMO_SCHEDULED: "stage_schedule_meeting",
  PROPOSAL: "stage_proposal",
  NEGOTIATION: "stage_proposal",
  INVOICE: "stage_proposal",
  FOLLOW_UP: "stage_follow_up",
  QUALIFIED: "stage_qualified",
};

export const NURTURE_EVENT_ORDER: LeadNurtureEventId[] = [
  "welcome",
  "assigned",
  "post_call",
  "stage_schedule_meeting",
  "stage_proposal",
  "stage_follow_up",
  "stage_qualified",
  "alert_payment_pending",
  "alert_quotation_pending",
  "alert_negotiation",
];

export const ALERT_EVENT_ORDER: LeadNurtureEventId[] = [
  "alert_payment_pending",
  "alert_quotation_pending",
  "alert_negotiation",
];

export function isLeadNurtureEventId(value: string): value is LeadNurtureEventId {
  return value in LEAD_NURTURE_EVENT_LABELS;
}

export const NURTURE_TEMPLATE_PLACEHOLDERS = [
  { key: "{{firstName}}", label: "Lead first name" },
  { key: "{{requirement}}", label: "Requirement text" },
  { key: "{{company}}", label: "Company name" },
  { key: "{{topic}}", label: "Category / topic" },
  { key: "{{counsellor}}", label: "Assigned team member" },
  { key: "{{discussion}}", label: "Call / meeting notes" },
  { key: "{{nextStep}}", label: "Next step / stage label" },
] as const;

export type LeadAlertRuleConfig = {
  enabled: boolean;
  afterDays: number;
};

export type LeadAlertOrgConfig = {
  paymentNotReceived: LeadAlertRuleConfig;
  quotationNotAccepted: LeadAlertRuleConfig;
  negotiationFollowUp: LeadAlertRuleConfig;
};

export type LeadNurtureOrgConfig = {
  enabled: boolean;
  stageMinGapHours: number;
  templates: Partial<Record<LeadNurtureEventId, string>>;
  alerts: LeadAlertOrgConfig;
};
