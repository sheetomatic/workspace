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

/** Next Time (LOST) + archived “old” leads get the AI reopen WA text. */
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
 * Prefill for wa.me on Next Time / old (archived) leads —
 * recalls last requirement and leads with current Sheetomatic AI.
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

You earlier asked about *${requirement}* — checking if that is still open.

Quick update: *Sheetomatic AI* is live now —
• WhatsApp AI that replies from *your* business knowledge (not generic chat)
• AI inside the workspace for FMS, IMS, tasks & weekly EM Ready
• Faster follow-ups so the owner spends less time chasing

If *${requirement}* is still needed, reply *DEMO* and I will show how AI fits your flow in 5 minutes.

— Team Sheetomatic`;
}

/** wa.me message: AI reopen for Next Time / archived, else undefined (default greeting). */
export function leadWhatsAppPrefillMessage(
  lead: LeadAiReengageInput,
): string | undefined {
  if (!shouldUseAiReengageWhatsAppMessage(lead)) {
    return undefined;
  }
  return buildLeadAiReengageMessage(lead);
}
