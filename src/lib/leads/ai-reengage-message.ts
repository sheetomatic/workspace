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

/**
 * wa.me click-to-chat prefill for Next Time / archived leads.
 * Manual send only — the human taps Send in WhatsApp. Not Official API, not MAS.
 */
export function buildLeadAiReengageMessage(lead: LeadAiReengageInput): string {
  const requirement = resolveInquiryRequirementPhrase({
    requirement: lead.requirement,
    category: (lead.category as LeadCategoryId | null) ?? null,
    company: lead.company,
    campaign: lead.campaign,
    utmCampaign: lead.utmCampaign,
    utmContent: lead.utmContent,
    landingPage: lead.landingPage,
    channel: lead.channel ?? null,
  });

  return `Hi ${firstName(lead.name)},

You had asked about *${requirement}*. Checking if that is still on your mind.

We have upgraded what we deliver. Same team, more of the stack is actually live now:

-> *Remote DME*
-> *AI Enabled Tasks System* — assign work, due dates, follow-ups without chasing chats
-> *CRM* — ready to use, and we customise it to how you already sell
-> *HRMS* — attendance, leave, payroll, geo fencing
-> *Zero Effort BCI Suite* — FMS, IMS, Checklist, EM Ready dashboards so the weekly review starts with data, not Excel prep

If you need something that is not a product box, we still build *custom software on AppSheet, Google Sheets, and Apps Script*.

If this is useful, reply *Yes*.
If not, reply *No* and I will not follow up.

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
