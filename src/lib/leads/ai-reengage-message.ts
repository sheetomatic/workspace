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

/** Next Time (LOST) + archived “old” leads get the upgrade WhatsApp prefill. */
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

function firstName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "there";
  }
  return trimmed.split(/\s+/)[0] ?? "there";
}

const BOLD_A = 0x1d5d4;
const BOLD_a = 0x1d5ee;

/** wa.me does not honour *markdown*. Map A–Z/a–z to mathematical sans-serif bold. */
export function toWhatsAppSansSerifBold(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ch >= "A" && ch <= "Z") {
      out += String.fromCodePoint(BOLD_A + (ch.charCodeAt(0) - 65));
    } else if (ch >= "a" && ch <= "z") {
      out += String.fromCodePoint(BOLD_a + (ch.charCodeAt(0) - 97));
    } else {
      out += ch;
    }
  }
  return out;
}

const TOPIC_MAX = 32;

function topicForPrefill(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim() || "your earlier enquiry";
  if (cleaned.length <= TOPIC_MAX) {
    return cleaned;
  }
  return `${cleaned.slice(0, TOPIC_MAX - 3)}...`;
}

/**
 * wa.me click-to-chat prefill for Next Time / archived leads.
 * Manual send only. No ASCII asterisks — Unicode bold only.
 */
export function buildLeadAiReengageMessage(lead: LeadAiReengageInput): string {
  const requirement = topicForPrefill(
    resolveInquiryRequirementPhrase({
      requirement: lead.requirement,
      category: (lead.category as LeadCategoryId | null) ?? null,
      company: lead.company,
      campaign: lead.campaign,
      utmCampaign: lead.utmCampaign,
      utmContent: lead.utmContent,
      landingPage: lead.landingPage,
      channel: lead.channel ?? null,
    }),
  );
  const topic = toWhatsAppSansSerifBold(requirement);
  const remoteDme = toWhatsAppSansSerifBold("Remote DME");
  const tasks = toWhatsAppSansSerifBold("AI Enabled Tasks System");
  const crm = toWhatsAppSansSerifBold("CRM");
  const hrms = toWhatsAppSansSerifBold("HRMS");
  const bci = toWhatsAppSansSerifBold("Zero Effort BCI Suite");
  const custom = toWhatsAppSansSerifBold(
    "custom software on AppSheet, Google Sheets, and Apps Script",
  );
  const yes = toWhatsAppSansSerifBold("Yes");
  const no = toWhatsAppSansSerifBold("No");

  return `Hi ${firstName(lead.name)},

You had asked about ${topic}. Is that requirement still open?

Sheetomatic has expanded what we can put live for your team:

← ${remoteDme}
← ${tasks} — tasks, due dates, follow-ups
← ${crm} — ready to use, tailored to how you sell
← ${hrms} — attendance, leave, payroll, geo-fencing
← ${bci} — FMS, IMS, Checklist, EM Ready dashboards

We also build ${custom}.

Reply ${yes} for a short walkthrough.
Reply ${no} and I will close this follow-up.

Regards,
Automation Team
Sheetomatic Technologies
www.sheetomatic.com | youtube.com/@sheetomatic`;
}

/** wa.me message: upgrade follow-up for Next Time / archived, else undefined. */
export function leadWhatsAppPrefillMessage(
  lead: LeadAiReengageInput,
): string | undefined {
  if (!shouldUseAiReengageWhatsAppMessage(lead)) {
    return undefined;
  }
  return buildLeadAiReengageMessage(lead);
}
