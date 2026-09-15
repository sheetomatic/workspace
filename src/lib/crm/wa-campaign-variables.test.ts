import { describe, expect, it } from "vitest";
import {
  waCampaignDeleteConfirm,
  waCampaignNeedsPauseBeforeDelete,
} from "@/lib/crm/wa-campaign-variables";

describe("campaign delete", () => {
  it("deletes drafts without pausing", () => {
    expect(waCampaignNeedsPauseBeforeDelete("DRAFT")).toBe(false);
    expect(waCampaignNeedsPauseBeforeDelete("PAUSED")).toBe(false);
    expect(waCampaignNeedsPauseBeforeDelete("COMPLETED")).toBe(false);
    expect(waCampaignDeleteConfirm("Diwali outreach", "DRAFT")).toBe(
      "Delete “Diwali outreach”? This cannot be undone. Nothing more will send.",
    );
  });

  it("pauses running or queued campaigns before delete", () => {
    expect(waCampaignNeedsPauseBeforeDelete("RUNNING")).toBe(true);
    expect(waCampaignNeedsPauseBeforeDelete("QUEUED")).toBe(true);
    expect(waCampaignDeleteConfirm("Diwali outreach", "RUNNING")).toBe(
      "Pause sending and delete “Diwali outreach”? Nothing more will send.",
    );
  });
});
