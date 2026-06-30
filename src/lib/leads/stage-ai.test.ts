import { describe, expect, it } from "vitest";
import { inferLeadStageFromRequirement, mapSheetStageToStatus } from "@/lib/leads/stage-ai";

describe("inferLeadStageFromRequirement", () => {
  it("suggests schedule meeting for CRM automation needs", () => {
    expect(inferLeadStageFromRequirement("CRM watsapp automation with google sheet")).toBe(
      "SCHEDULE_MEETING",
    );
  });

  it("suggests proposal for quotation requests", () => {
    expect(inferLeadStageFromRequirement("Please send quotation for chatbot")).toBe("PROPOSAL");
  });

  it("suggests invoice for tax invoice requests", () => {
    expect(inferLeadStageFromRequirement("Please send tax invoice for the project")).toBe(
      "INVOICE",
    );
  });

  it("maps sheet next step labels", () => {
    expect(mapSheetStageToStatus("Make Proposal | Invoice")).toBe("PROPOSAL");
    expect(mapSheetStageToStatus("Invoice")).toBe("INVOICE");
    expect(mapSheetStageToStatus("Schedule Meeting")).toBe("SCHEDULE_MEETING");
  });
});
