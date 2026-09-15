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

  it("includes the commercial upgrade copy, last requirement, Yes, and No", () => {
    const text = buildLeadAiReengageMessage({
      name: "Rahul Jain",
      requirement: "WhatsApp API",
      status: "LOST",
    });
    expect(text).toContain("Hi Rahul");
    expect(text).toContain(
      "You had asked about *WhatsApp API*. I wanted to check whether that requirement is still open.",
    );
    expect(text).toContain("← *Remote DME*");
    expect(text).toContain(
      "← *AI Enabled Tasks System* — owned tasks, due dates, and follow-ups without chasing group chats",
    );
    expect(text).toContain(
      "← *CRM* — ready to use, and tailored to how you already sell",
    );
    expect(text).toContain(
      "← *HRMS* — attendance, leave, payroll, and geo-fencing",
    );
    expect(text).toContain(
      "← *Zero Effort BCI Suite* — FMS, IMS, Checklist, and EM Ready dashboards, so the weekly review starts with numbers, not spreadsheet prep",
    );
    expect(text).not.toContain("->");
    expect(text).toContain(
      "*custom software on AppSheet, Google Sheets, and Apps Script*",
    );
    expect(text).toContain("reply *Yes*");
    expect(text).toContain("reply *No*");
    expect(text).toContain("I will close the follow-up");
    expect(text).not.toContain("DEMO");
    expect(text).not.toContain("STOP");
    expect(text).not.toContain("still on your mind");
    expect(text).not.toContain("product box");
    expect(text).toContain("Automation Team");
    expect(text).toContain("Sheetomatic Technologies");
    expect(text).toContain("www.sheetomatic.com");
    expect(text).toContain("youtube.com/@sheetomatic");
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
      "You had asked about *WhatsApp API*",
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
