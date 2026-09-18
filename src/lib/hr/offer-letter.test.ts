import { describe, expect, it } from "vitest";
import { renderOfferLetterHtml } from "@/lib/hr/offer-letter";

describe("renderOfferLetterHtml", () => {
  it("includes role, CTC, probation, and candidate name", () => {
    const html = renderOfferLetterHtml({
      organizationName: "Sheetomatic",
      candidateName: "Nidhi Sharma",
      roleTitle: "MIS Executive",
      department: "Operations",
      employmentType: "FULL_TIME",
      ctcAnnual: 480000,
      ctcMonthly: 40000,
      joiningDate: new Date("2026-10-01T12:00:00.000Z"),
      probationMonths: 6,
      offerValidUntil: new Date("2026-09-25T12:00:00.000Z"),
      workLocation: "Raipur",
      reportingTo: "Ops Manager",
      benefitsNotes: "PF as per Act",
    });
    expect(html).toContain("Nidhi Sharma");
    expect(html).toContain("MIS Executive");
    expect(html).toContain("Sheetomatic");
    expect(html).toContain("6 month");
    expect(html).toContain("Raipur");
    expect(html).toContain("PF as per Act");
  });
});
