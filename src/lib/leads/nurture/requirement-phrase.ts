import type { LeadSourceChannel } from "@prisma/client";
import {
  LEAD_CATEGORIES,
  type LeadCategoryId,
} from "@/lib/leads/categories";
import { LEAD_CHANNEL_LABELS } from "@/lib/leads/channels";

const GENERIC_REQUIREMENT_PHRASES = new Set([
  "general inquiry",
  "general enquiry",
  "general enquiry.",
  "general inquiry.",
  "general",
  "inquiry",
  "enquiry",
  "n/a",
  "na",
  "none",
  "-",
  "--",
  "test",
  "interested",
  "information",
  "info",
  "hello",
  "hi",
  "hey",
]);

export function isGenericRequirementText(text: string | null | undefined): boolean {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) {
    return true;
  }
  return GENERIC_REQUIREMENT_PHRASES.has(trimmed.toLowerCase());
}

function truncatePhrase(text: string, max = 150) {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}…`;
}

function landingPageHint(landingPage: string | null | undefined): string | null {
  const raw = landingPage?.trim();
  if (!raw) {
    return null;
  }
  try {
    const path = raw.includes("://") ? new URL(raw).pathname : raw;
    const cleaned = path
      .replace(/\/+/g, "/")
      .replace(/^\/|\/$/g, "")
      .replace(/[-_]/g, " ")
      .trim();
    if (!cleaned) {
      return "your website enquiry";
    }
    return truncatePhrase(`your enquiry about ${cleaned}`);
  } catch {
    return "your website enquiry";
  }
}

/**
 * Text for WhatsApp nurture {{requirement}} — never "General inquiry".
 * Prefer the lead's own words, then specific category / campaign / channel.
 */
export function resolveInquiryRequirementPhrase(params: {
  requirement?: string | null;
  category?: LeadCategoryId | null;
  company?: string | null;
  campaign?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  landingPage?: string | null;
  channel?: LeadSourceChannel | null;
}): string {
  const requirement = params.requirement?.trim();
  if (requirement && !isGenericRequirementText(requirement)) {
    return truncatePhrase(requirement);
  }

  if (
    params.category &&
    params.category !== "GENERAL" &&
    params.category in LEAD_CATEGORIES
  ) {
    return LEAD_CATEGORIES[params.category].label;
  }

  const campaign =
    params.campaign?.trim() ||
    params.utmCampaign?.trim() ||
    params.utmContent?.trim();
  if (campaign && !isGenericRequirementText(campaign)) {
    return truncatePhrase(campaign);
  }

  const fromLanding = landingPageHint(params.landingPage);
  if (fromLanding) {
    return fromLanding;
  }

  const company = params.company?.trim();
  if (company) {
    return `how Sheetomatic can help ${company}`;
  }

  if (params.channel && params.channel in LEAD_CHANNEL_LABELS) {
    const channelLabel = LEAD_CHANNEL_LABELS[params.channel];
    return `your ${channelLabel} enquiry — please reply with the exact requirement`;
  }

  return "your enquiry — please reply with the exact requirement (FMS, IMS, tasks, WhatsApp API, training, website, or HR)";
}

/** Category label for {{topic}} — avoid vague "General inquiry". */
export function resolveNurtureTopicLabel(
  category: LeadCategoryId | null | undefined,
): string {
  if (!category || category === "GENERAL" || !(category in LEAD_CATEGORIES)) {
    return "operations automation";
  }
  return LEAD_CATEGORIES[category].label;
}
