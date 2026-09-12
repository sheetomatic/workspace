import { describe, expect, it } from "vitest";
import {
  buildLeadAiReengageMessage,
  leadWhatsAppPrefillMessage,
  shouldUseAiReengageWhatsAppMessage,
} from "@/lib/leads/ai-reengage-message";

describe("ai-reengage-message", () => {
  it("uses AI reopen for Next Time (LOST) and archived leads", () => {
    expect(shouldUseAiReengageWhatsAppMessage({ status: "LOST" })).toBe(true);
    expect(
      shouldUseAiReengageWhatsAppMessage({
        status: "NEW",
        archivedAt: "2026-01-01",
      }),
    ).toBe(true);
    expect(shouldUseAiReengageWhatsAppMessage({ status: "NEW" })).toBe(false);
  });

  it("includes last requirement and AI hooks", () => {
    const text = buildLeadAiReengageMessage({
      name: "Rahul Jain",
      requirement: "FMS for dispatch follow-up",
      status: "LOST",
    });
    expect(text).toContain("Hi Rahul");
    expect(text).toContain("FMS for dispatch follow-up");
    expect(text).toContain("Sheetomatic AI");
    expect(text).toContain("DEMO");
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
