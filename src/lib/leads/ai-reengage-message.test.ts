import { describe, expect, it } from "vitest";
import { leadWhatsAppHref } from "@/lib/leads/contact-links";
import {
  buildLeadAiReengageMessage,
  leadWhatsAppPrefillMessage,
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

  it("opens wa.me click-to-chat with the prefill, not an API send", () => {
    const text = buildLeadAiReengageMessage({
      name: "Rahul Jain",
      requirement: "WhatsApp API",
      status: "LOST",
    });
    const href = leadWhatsAppHref("9876543210", "Rahul Jain", text);
    expect(href).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    expect(decodeURIComponent(href!.split("text=")[1] ?? "")).toContain(
      "You earlier asked about WhatsApp API",
    );
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
