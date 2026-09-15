import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_APPROACHED_STATUSES,
  CAMPAIGN_AUDIENCE_APPROACHED,
  campaignAudienceLabel,
  isApproachedNotConvertedAudience,
  listCampaignAudienceOptions,
} from "@/lib/crm/wa-campaign-audiences";

describe("campaign audiences", () => {
  it("labels the default approached / not converted segment", () => {
    expect(isApproachedNotConvertedAudience(CAMPAIGN_AUDIENCE_APPROACHED)).toBe(
      true,
    );
    expect(campaignAudienceLabel(CAMPAIGN_AUDIENCE_APPROACHED)).toBe(
      "Approached — not converted",
    );
    expect(campaignAudienceLabel("FMS_BCI")).toBe("FMS / BCI (Operations)");
  });

  it("puts Approached — not converted first in the picker", () => {
    const options = listCampaignAudienceOptions();
    expect(options[0]).toEqual({
      id: CAMPAIGN_AUDIENCE_APPROACHED,
      label: "Approached — not converted",
    });
    expect(options.some((row) => row.id === "FMS_BCI")).toBe(true);
  });

  it("keeps Won and Next Time out of the default audience", () => {
    expect(CAMPAIGN_APPROACHED_STATUSES).toContain("CONTACTED");
    expect(CAMPAIGN_APPROACHED_STATUSES).toContain("NEW");
    expect(CAMPAIGN_APPROACHED_STATUSES).not.toContain("WON");
    expect(CAMPAIGN_APPROACHED_STATUSES).not.toContain("LOST");
  });
});
