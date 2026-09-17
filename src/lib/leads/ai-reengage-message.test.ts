import { describe, expect, it } from "vitest";
import { leadWhatsAppHref } from "@/lib/leads/contact-links";
import {
  buildLeadAiReengageMessage,
  leadWhatsAppPrefillMessage,
  shouldUseAiReengageWhatsAppMessage,
  toWhatsAppSansSerifBold,
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

  it("uses Unicode bold, no ASCII asterisks, and the short Yes/No body", () => {
    const text = buildLeadAiReengageMessage({
      name: "Rahul Jain",
      requirement: "WhatsApp API",
      status: "LOST",
    });
    expect(text).toContain("Hi Rahul");
    expect(text).not.toContain("*");
    expect(text).toContain(toWhatsAppSansSerifBold("WhatsApp API"));
    expect(text).toContain(`← ${toWhatsAppSansSerifBold("Remote DME")}`);
    expect(text).toContain(
      `← ${toWhatsAppSansSerifBold("AI Enabled Tasks System")} — tasks, due dates, follow-ups`,
    );
    expect(text).toContain(
      `← ${toWhatsAppSansSerifBold("CRM")} — ready to use, tailored to how you sell`,
    );
    expect(text).toContain(
      `← ${toWhatsAppSansSerifBold("HRMS")} — attendance, leave, payroll, geo-fencing`,
    );
    expect(text).toContain("EM Ready dashboards");
    expect(text).toContain(
      toWhatsAppSansSerifBold(
        "custom software on AppSheet, Google Sheets, and Apps Script",
      ),
    );
    expect(text).toContain(`Reply ${toWhatsAppSansSerifBold("Yes")}`);
    expect(text).toContain(`Reply ${toWhatsAppSansSerifBold("No")}`);
    expect(text).not.toContain("DEMO");
    expect(text).not.toContain("STOP");
    expect(text).not.toContain("->");
    expect(text).toContain("Automation Team");
    expect(text).toContain("www.sheetomatic.com");
    expect(text).toContain("youtube.com/@sheetomatic");
  });

  it("opens wa.me with encodeURIComponent of the full prefill", () => {
    const text = buildLeadAiReengageMessage({
      name: "Rahul Jain",
      requirement: "WhatsApp API",
      status: "LOST",
    });
    const href = leadWhatsAppHref("9876543210", "Rahul Jain", text);
    expect(href).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    const encoded = href!.slice(href!.indexOf("text=") + 5);
    expect(encoded).toBe(encodeURIComponent(text));
    const decoded = decodeURIComponent(encoded);
    expect(decoded).toBe(text);
    expect(decoded).toContain("EM Ready dashboards");
    expect(decoded).not.toContain("*");
    expect(decoded).toContain("youtube.com/@sheetomatic");
    expect(href!.length).toBeLessThan(4096);
  });

  it("returns prefill only for reengage statuses", () => {
    const prefill = leadWhatsAppPrefillMessage({
      name: "A",
      requirement: "IMS reorder alerts",
      status: "LOST",
    });
    expect(prefill).toContain(toWhatsAppSansSerifBold("IMS reorder alerts"));
    expect(prefill).not.toContain("*");
    expect(
      leadWhatsAppPrefillMessage({
        name: "A",
        requirement: "IMS reorder alerts",
        status: "NEW",
      }),
    ).toBeUndefined();
  });
});
