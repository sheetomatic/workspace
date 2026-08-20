import type { InboundLeadStatus, LeadCallingStatus } from "@prisma/client";
import {
  CALLING_STATUS_LABELS,
  LEAD_STATUS_LABELS,
  resolveLeadStatus,
} from "@/lib/leads/status-labels";

const INTERNAL_STEP_LABELS = new Set<string>([
  ...Object.values(LEAD_STATUS_LABELS),
  ...Object.values(CALLING_STATUS_LABELS),
]);

function isInternalCrmLabel(value: string) {
  return INTERNAL_STEP_LABELS.has(value.trim());
}

/** Client-facing next action — never dump CRM stages like “Meeting notes”. */
export function clientFacingNurtureNextStep(params: {
  status?: InboundLeadStatus | string | null;
  callingStatus?: LeadCallingStatus | null;
  nextStepLabel?: string | null;
}): string {
  const custom = params.nextStepLabel?.trim();
  if (custom && !isInternalCrmLabel(custom)) {
    return custom;
  }

  const meetingDone =
    params.callingStatus === "MEETING_DONE" ||
    (params.status ? resolveLeadStatus(params.status) === "MEETING_NOTES" : false);

  if (meetingDone) {
    return "We will work on the points from today's meeting and share the next update with you shortly.";
  }

  const status = params.status ? resolveLeadStatus(params.status) : null;
  switch (status) {
    case "SCHEDULE_MEETING":
      return "Please share 2 convenient time slots and we will confirm the meeting.";
    case "DEMO_SCHEDULED":
      return "Please join the meeting at the scheduled time using the Meet link we shared.";
    case "PROPOSAL":
    case "INVOICE":
      return "We will share the proposal / quotation with you shortly.";
    case "TRIAL":
      return "Explore the trial at your pace — we will check in before it ends.";
    case "NEGOTIATION":
      return "We will refine the commercial based on our discussion and come back to you.";
    case "PAYMENT":
      return "Please complete the payment so we can start delivery.";
    case "PROJECT_ACTIVE":
    case "WON":
      return "We will begin delivery as discussed.";
    case "FOLLOW_UP":
      return "We will follow up with you shortly on the points discussed.";
    case "QUALIFIED":
      return "We will share the demo scope, timeline, and commercial based on our discussion.";
    default:
      return "We will share the next update with you shortly.";
  }
}

export function postCallThanksLine(params: {
  status?: InboundLeadStatus | string | null;
  callingStatus?: LeadCallingStatus | null;
}) {
  const meetingDone =
    params.callingStatus === "MEETING_DONE" ||
    (params.status ? resolveLeadStatus(params.status) === "MEETING_NOTES" : false);
  return meetingDone
    ? "Thank you for the meeting today"
    : "Thank you for speaking with us";
}
