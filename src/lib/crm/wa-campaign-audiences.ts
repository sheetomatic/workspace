import { leadCategoryLabel, listLeadCategoryOptions } from "@/lib/leads/categories";
import { OPEN_LEAD_STATUSES } from "@/lib/leads/status-labels";

/** Pipeline audience: inbound leads still open — not Won, not Next Time. */
export const CAMPAIGN_AUDIENCE_APPROACHED = "APPROACHED_NOT_CONVERTED";

export const CAMPAIGN_AUDIENCE_APPROACHED_LABEL = "Approached — not converted";

export function isApproachedNotConvertedAudience(id: string) {
  return id.trim() === CAMPAIGN_AUDIENCE_APPROACHED;
}

export function campaignAudienceLabel(id: string) {
  if (isApproachedNotConvertedAudience(id)) {
    return CAMPAIGN_AUDIENCE_APPROACHED_LABEL;
  }
  return leadCategoryLabel(id);
}

export const CAMPAIGN_APPROACHED_STATUSES = OPEN_LEAD_STATUSES;

export function listCampaignAudienceOptions(): Array<{ id: string; label: string }> {
  return [
    { id: CAMPAIGN_AUDIENCE_APPROACHED, label: CAMPAIGN_AUDIENCE_APPROACHED_LABEL },
    ...listLeadCategoryOptions(),
  ];
}
