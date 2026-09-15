import { describe, expect, it } from "vitest";
import {
  buildLeadAiReengageMessage,
  leadWhatsAppPrefillMessage,
  NEXT_TIME_WA_TEMPLATE_NAME,
  nextTimeWhatsAppTemplateVariables,
  shouldUseAiReengageWhatsAppMessage,
} from "@/lib/leads/ai-reengage-message";

describe("ai-reengage-message", () => {
  it("uses Next Time follow-up for Next Time (LOST) and archived leads", () => {
    expect(shouldUseAiReengageWhatsAppMessage({ status: "LOST" })).toBe(true);
    expect(
      shouldUseAiReengageWhatsAppMessage({
        status: "NEW",
        archivedAt: "2026-01-01",
      }),
    ).toBe(true);
    expect(shouldUseAiReengageWhatsAppMessage({ status: "NEW" })).toBe(false);
  });

  it("includes the upgrade copy, last requirement, DEMO, and STOP", () => {
    const text = buildLeadAiReengageMessage({
      name: "Rahul Jain",
      requirement: "WhatsApp API",
      status: "LOST",
    });
    expect(text).toContain("Hi Rahul");
    expect(text).toContain(
      "You earlier asked about WhatsApp API — checking if that is still open.",
    );
    expect(text).toContain("Remote DME");
    expect(text).toContain("AI Enabled Tasks System");
    expect(text).toContain("CRM");
    expect(text).toContain("HRMS");
    expect(text).toContain(
      "Zero Effort BCI Suite — FMS, IMS, Checklist, EM Ready dashboards",
    );
    expect(text).toContain("AppSheet, Google Sheets, and Apps Script");
    expect(text).toContain("reply DEMO");
    expect(text).toMatch(/reply STOP/);
    expect(text).toContain("Automation Team");
    expect(text).toContain("Sheetomatic Technologies");
    expect(text).toContain("www.sheetomatic.com");
    expect(text).toContain("youtube.com/@sheetomatic");
    expect(text).not.toContain("Sheetomatic AI is live now");
  });

  it("keeps STOP in Latin so the keyword matches", () => {
    const text = buildLeadAiReengageMessage({
      name: "Priya",
      requirement: "FMS",
      status: "LOST",
    });
    expect(text).toContain("STOP");
    expect(text).not.toMatch(/स्टॉप|रोकें/);
  });

  it("maps Official API template variables {{1}} name and {{2}} topic", () => {
    expect(NEXT_TIME_WA_TEMPLATE_NAME).toBe("sm_mkt_next_time_upgrade");
    expect(
      nextTimeWhatsAppTemplateVariables({
        name: "Rahul Jain",
        requirement: "WhatsApp API",
        status: "LOST",
      }),
    ).toEqual(["Rahul", "WhatsApp API"]);
  });

  it("returns prefill only for reengage statuses", () => {
    expect(
      leadWhatsAppPrefillMessage({
        name: "A",
        requirement: "IMS reorder alerts",
        status: "LOST",
      }),
    ).toContain("IMS reorder alerts");
    expect(
      leadWhatsAppPrefillMessage({
        name: "A",
        requirement: "IMS reorder alerts",
        status: "NEW",
      }),
    ).toBeUndefined();
  });
});
