import type { InboundLeadStatus } from "@prisma/client";
import type { LeadCategoryId } from "@/lib/leads/categories";
import { LEAD_CATEGORIES } from "@/lib/leads/categories";
import { leadStatusLabel } from "@/lib/leads/status-labels";
import type { LeadNurtureEventId } from "@/lib/leads/nurture/events";
import type { LeadNurtureOrgConfig } from "@/lib/leads/nurture/events";
import {
  interpolateNurtureTemplate,
  resolveNurtureTemplate,
} from "@/lib/leads/nurture/config";

export type { LeadNurtureEventId } from "@/lib/leads/nurture/events";
export {
  LEAD_NURTURE_EVENT_LABELS,
  STAGE_NURTURE_MIN_GAP_HOURS,
  STATUS_TO_NURTURE_EVENT,
} from "@/lib/leads/nurture/events";

function leadFirstName(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "there";
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function categoryLabel(category: LeadCategoryId | null | undefined) {
  if (!category || !(category in LEAD_CATEGORIES)) {
    return "operations automation";
  }
  return LEAD_CATEGORIES[category as LeadCategoryId].label;
}

function trimSummary(text: string | null | undefined, max = 220) {
  const trimmed = text?.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
}

function assigneeDisplay(name: string | null | undefined) {
  const trimmed = name?.trim();
  return trimmed || "our counsellor";
}

export function buildLeadNurtureMessage(params: {
  event: LeadNurtureEventId;
  name?: string | null;
  category?: LeadCategoryId | null;
  requirement?: string | null;
  company?: string | null;
  assigneeName?: string | null;
  discussionSummary?: string | null;
  nextStepLabel?: string | null;
  status?: InboundLeadStatus | null;
  nurtureConfig?: LeadNurtureOrgConfig | null;
}): string {
  const firstName = leadFirstName(params.name);
  const topic = categoryLabel(params.category ?? null);
  const requirement = params.requirement?.trim();
  const company = params.company?.trim();
  const counsellor = assigneeDisplay(params.assigneeName);
  const summary = trimSummary(params.discussionSummary);
  const stage = params.nextStepLabel ?? (params.status ? leadStatusLabel(params.status) : null);

  const vars: Record<string, string> = {
    "{{firstName}}": firstName,
    "{{requirement}}": requirement
      ? requirement.length > 150
        ? `${requirement.slice(0, 150)}…`
        : requirement
      : topic,
    "{{company}}": company || "your company",
    "{{topic}}": topic,
    "{{counsellor}}": counsellor,
    "{{discussion}}": summary || "Thank you for your time on the call today.",
    "{{nextStep}}": stage || "We will share the next steps with you shortly.",
  };

  if (params.nurtureConfig) {
    const template = resolveNurtureTemplate(params.event, params.nurtureConfig);
    return interpolateNurtureTemplate(template, vars);
  }

  switch (params.event) {
    case "welcome":
      return [
        `Hi ${firstName},`,
        "",
        "Thank you for contacting *Sheetomatic*!",
        requirement
          ? `We have received your inquiry regarding *${requirement.slice(0, 150)}${requirement.length > 150 ? "…" : ""}*.`
          : company
            ? `We have received your inquiry from *${company}* about *${topic}*.`
            : `We have received your inquiry about *${topic}*.`,
        "",
        "Our team will contact you *very soon* on this WhatsApp number.",
        "No need to call us — we have your details and will reach out shortly.",
        "",
        "— Team Sheetomatic",
      ].join("\n");

    case "assigned":
      return [
        `Hi ${firstName},`,
        "",
        `Good news — your inquiry has been assigned to *${counsellor}* from our team.`,
        "",
        `${counsellor} will be *calling you shortly* on this number to understand your requirement in detail.`,
        "",
        "If you miss the call, reply *CALL* here and we will ring you back.",
        "",
        "— Team Sheetomatic",
      ].join("\n");

    case "post_call":
      return [
        `Hi ${firstName},`,
        "",
        `Thank you for speaking with us${params.assigneeName ? ` — ${counsellor}` : ""}.`,
        "",
        summary
          ? `*As discussed:*\n${summary}`
          : "Thank you for your time on the call today.",
        "",
        stage
          ? `*Next step:* ${stage}`
          : "We will share the next steps with you shortly.",
        "",
        "If anything was missed in our notes, reply here and we will update it.",
        "",
        `— ${counsellor}, Sheetomatic`,
      ].join("\n");

    case "stage_schedule_meeting":
      return [
        `Hi ${firstName},`,
        "",
        "As discussed, let's schedule a short demo / meeting.",
        "",
        "Please share *2 convenient time slots* (Mon–Sat, 11 AM–6 PM IST) and we will confirm on WhatsApp.",
        "",
        "— Team Sheetomatic",
      ].join("\n");

    case "stage_proposal":
      return [
        `Hi ${firstName},`,
        "",
        `We are preparing the *proposal / quotation* for your *${topic}* requirement.`,
        "",
        "Our team will share it with you shortly. Reply here if you have any questions on scope or pricing.",
        "",
        "— Team Sheetomatic",
      ].join("\n");

    case "stage_follow_up":
      return [
        `Hi ${firstName},`,
        "",
        "Just a gentle follow-up on your inquiry with Sheetomatic.",
        "",
        "Reply *YES* if you are still exploring, or *LATER* if we should check back next week.",
        "",
        "— Team Sheetomatic",
      ].join("\n");

    case "stage_qualified":
      return [
        `Hi ${firstName},`,
        "",
        "Thank you — your requirement looks like a good fit for Sheetomatic.",
        "",
        "We will share the next steps (demo scope, timeline, and commercial) based on our discussion.",
        "",
        "— Team Sheetomatic",
      ].join("\n");

    case "alert_payment_pending":
      return [
        `Hi ${firstName},`,
        "",
        "Friendly reminder — we are awaiting *payment* against your Sheetomatic invoice / commercial.",
        "",
        "Once payment is received, we can start / continue delivery without delay.",
        "",
        "Reply here if you need the invoice, bank details, or a payment link again.",
        "",
        "— Team Sheetomatic",
      ].join("\n");

    case "alert_quotation_pending":
      return [
        `Hi ${firstName},`,
        "",
        "Just checking in — have you had a chance to review the *quotation / proposal* we shared?",
        "",
        "If anything needs clarification on scope, timeline, or pricing, reply here and we will adjust.",
        "",
        "Reply *OK* to proceed, or *DISCUSS* if you want a short negotiation call.",
        "",
        "— Team Sheetomatic",
      ].join("\n");

    case "alert_negotiation":
      return [
        `Hi ${firstName},`,
        "",
        "Following up on our *pricing / scope discussion*.",
        "",
        "We are happy to refine the proposal so it fits your budget and priority modules.",
        "",
        "Share what you would like changed, or pick a quick call slot — we will close this together.",
        "",
        "— Team Sheetomatic",
      ].join("\n");
  }
}
