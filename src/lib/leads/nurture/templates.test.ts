import { describe, expect, it } from "vitest";
import { defaultLeadNurtureConfig } from "@/lib/leads/nurture/config";
import { buildLeadNurtureMessage } from "@/lib/leads/nurture/templates";

describe("buildLeadNurtureMessage welcome", () => {
  it("does not send General inquiry when requirement is empty", () => {
    const body = buildLeadNurtureMessage({
      event: "welcome",
      name: "Ravi",
      category: "GENERAL",
      requirement: null,
      nurtureConfig: defaultLeadNurtureConfig(),
    });
    expect(body).toContain("Hi Ravi");
    expect(body.toLowerCase()).not.toContain("general inquiry");
    expect(body).toContain("exact requirement");
  });

  it("uses the lead requirement when present", () => {
    const body = buildLeadNurtureMessage({
      event: "welcome",
      name: "Anita",
      category: "GENERAL",
      requirement: "Need FMS for order dispatch",
      nurtureConfig: defaultLeadNurtureConfig(),
    });
    expect(body).toContain("Need FMS for order dispatch");
    expect(body.toLowerCase()).not.toContain("general inquiry");
  });
});
