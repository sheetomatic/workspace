import { describe, expect, it } from "vitest";
import {
  isGenericRequirementText,
  resolveInquiryRequirementPhrase,
  resolveNurtureTopicLabel,
} from "@/lib/leads/nurture/requirement-phrase";

describe("isGenericRequirementText", () => {
  it("treats empty and General inquiry as generic", () => {
    expect(isGenericRequirementText(null)).toBe(true);
    expect(isGenericRequirementText("")).toBe(true);
    expect(isGenericRequirementText("General inquiry")).toBe(true);
    expect(isGenericRequirementText("GENERAL ENQUIRY")).toBe(true);
  });

  it("keeps real requirements", () => {
    expect(isGenericRequirementText("Need FMS for dispatch")).toBe(false);
  });
});

describe("resolveInquiryRequirementPhrase", () => {
  it("prefers real requirement text", () => {
    expect(
      resolveInquiryRequirementPhrase({
        requirement: "Need IMS reorder alerts",
        category: "GENERAL",
      }),
    ).toBe("Need IMS reorder alerts");
  });

  it("never falls back to General inquiry", () => {
    const phrase = resolveInquiryRequirementPhrase({
      requirement: null,
      category: "GENERAL",
    });
    expect(phrase.toLowerCase()).not.toContain("general inquiry");
    expect(phrase).toContain("please reply with the exact requirement");
  });

  it("uses specific category when requirement is missing", () => {
    expect(
      resolveInquiryRequirementPhrase({
        requirement: "",
        category: "FMS_BCI",
      }),
    ).toBe("FMS / BCI (Operations)");
  });

  it("uses campaign before vague category", () => {
    expect(
      resolveInquiryRequirementPhrase({
        requirement: "General inquiry",
        category: "GENERAL",
        campaign: "WhatsApp API launch",
      }),
    ).toBe("WhatsApp API launch");
  });

  it("uses channel-specific ask when nothing else is known", () => {
    expect(
      resolveInquiryRequirementPhrase({
        category: "GENERAL",
        channel: "WHATSAPP",
      }),
    ).toContain("WhatsApp");
  });
});

describe("resolveNurtureTopicLabel", () => {
  it("avoids General inquiry for GENERAL/null", () => {
    expect(resolveNurtureTopicLabel("GENERAL")).toBe("operations automation");
    expect(resolveNurtureTopicLabel(null)).toBe("operations automation");
  });
});
