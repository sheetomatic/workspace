import { describe, expect, it } from "vitest";
import { inferLeadStageFromRequirement, mapSheetStageToStatus } from "@/lib/leads/stage-ai";

describe("inferLeadStageFromRequirement", () => {
  it("suggests schedule meeting for CRM automation needs", () => {
    expect(inferLeadStageFromRequirement("CRM watsapp automation with google sheet")).toBe(
      "SCHEDULE_MEETING",
    );
  });

  it("suggests proposal for quotation requests", () => {
    expect(inferLeadStageFromRequirement("Please send quotation for chatbot")).toBe(
      "PROPOSAL_INVOICE",
    );
  });

  it("maps sheet next step labels", () => {
    expect(mapSheetStageToStatus("Make Proposal | Invoice")).toBe("PROPOSAL_INVOICE");
    expect(mapSheetStageToStatus("Schedule Meeting")).toBe("SCHEDULE_MEETING");
  });
});
