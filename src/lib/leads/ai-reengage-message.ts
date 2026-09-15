import type { InboundLeadStatus, LeadSourceChannel } from "@prisma/client";
import type { LeadCategoryId } from "@/lib/leads/categories";
import { resolveInquiryRequirementPhrase } from "@/lib/leads/nurture/requirement-phrase";
import { NEXT_TIME_LEAD_STATUSES } from "@/lib/leads/status-labels";

export type LeadAiReengageInput = {
  name?: string | null;
  requirement?: string | null;
  category?: string | null;
  company?: string | null;
  campaign?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  landingPage?: string | null;
  channel?: LeadSourceChannel | null;
  status?: InboundLeadStatus | null;
  archivedAt?: string | Date | null;
};

/** Next Time (LOST) + archived “old” leads get the upgrade WhatsApp follow-up. */
export function shouldUseAiReengageWhatsAppMessage(
  lead: Pick<LeadAiReengageInput, "status" | "archivedAt">,
): boolean {
  if (lead.archivedAt) {
    return true;
  }
  if (lead.status && NEXT_TIME_LEAD_STATUSES.includes(lead.status)) {
    return true;
  }
  return false;
}

/** Meta MARKETING template for CRM → Leads → Next Time WhatsApp. Must be Approved. */
export const NEXT_TIME_WA_TEMPLATE_NAME = "sm_mkt_next_time_upgrade";
export const NEXT_TIME_WA_TEMPLATE_LANGUAGE = "en";

export function nextTimeLeadFirstName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "there";
  }
  return trimmed.split(/\s+/)[0] ?? "there";
}

export function nextTimeInquiryTopic(lead: LeadAiReengageInput): string {
  return resolveInquiryRequirementPhrase({
    requirement: lead.requirement,
    category: (lead.category as LeadCategoryId | null) ?? null,
    company: lead.company,
    campaign: lead.campaign,
    utmCampaign: lead.utmCampaign,
    utmContent: lead.utmContent,
    landingPage: lead.landingPage,
    channel: lead.channel ?? null,
  });
}

function templateParam(value: string, fallback: string, max = 60): string {
  const cleaned = value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return fallback;
  }
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 3)}...`;
}

/** {{1}} first name · {{2}} what they asked — for sm_mkt_next_time_upgrade. */
export function nextTimeWhatsAppTemplateVariables(
  lead: LeadAiReengageInput,
): string[] {
  return [
    templateParam(nextTimeLeadFirstName(lead.name), "there", 40),
    templateParam(nextTimeInquiryTopic(lead), "your earlier enquiry", 60),
  ];
}

/**
 * Official API session body (24h) and Next Time WhatsApp copy.
 * Template name if outside the window: sm_mkt_next_time_upgrade (MARKETING, en).
 */
export function buildLeadAiReengageMessage(lead: LeadAiReengageInput): string {
  const requirement = nextTimeInquiryTopic(lead);

  return `Hi ${nextTimeLeadFirstName(lead.name)},

You earlier asked about ${requirement} — checking if that is still open.

We have upgraded our skills and services. Sheetomatic now has:

• Remote DME
• AI Enabled Tasks System
• CRM
• HRMS
• Zero Effort BCI Suite — FMS, IMS, Checklist, EM Ready dashboards

We also build custom software on AppSheet, Google Sheets, and Apps Script.

If you want a 5-minute look, reply DEMO.
If you are not interested, reply STOP.

Regards,
Automation Team
Sheetomatic Technologies
www.sheetomatic.com | youtube.com/@sheetomatic`;
}

/** wa.me prefill: Next Time / archived upgrade copy, else undefined (default greeting). */
export function leadWhatsAppPrefillMessage(
  lead: LeadAiReengageInput,
): string | undefined {
  if (!shouldUseAiReengageWhatsAppMessage(lead)) {
    return undefined;
  }
  return buildLeadAiReengageMessage(lead);
}
