import { describe, expect, it } from "vitest";
import {
  buildTemplateVariables,
  contactFieldValue,
  parseVariableMap,
} from "@/lib/crm/wa-campaign-variables";
import {
  extractTemplatePlaceholders,
  interpretOfficialWaSend,
  isApprovedOfficialTemplate,
  parseOfficialTemplateList,
  officialWaSendUserMessage,
} from "@/lib/integrations/sheetomatic-official-wa";

describe("Official WA campaign templates", () => {
  it("parses nested APPROVED templates and {{n}} slots", () => {
    const templates = parseOfficialTemplateList({
      results: [
        {
          template: {
            name: "hello_world",
            language: "en",
            status: "APPROVED",
            category: "UTILITY",
            components: [{ type: "BODY", text: "Hi {{1}}, order {{2}} in {{3}}." }],
          },
        },
        {
          template: {
            name: "draft_one",
            language: "en",
            status: "PENDING",
            components: [{ type: "BODY", text: "Hi {{1}}" }],
          },
        },
      ],
    });
    expect(templates).toHaveLength(2);
    expect(templates[0]?.variableCount).toBe(3);
    expect(extractTemplatePlaceholders("Hi {{1}} and {{3}}")).toBe(3);
    expect(isApprovedOfficialTemplate(templates[0]!)).toBe(true);
    expect(isApprovedOfficialTemplate(templates[1]!)).toBe(false);
  });

  it("maps {{1}}{{2}}{{3}} onto CRM contact fields", () => {
    const map = parseVariableMap({ "1": "firstName", "2": "company", "3": "city" });
    expect(
      buildTemplateVariables(3, map, {
        name: "Priya Shah",
        company: "Kapoor Jewellers",
        city: "Jaipur",
      }),
    ).toEqual(["Priya", "Kapoor Jewellers", "Jaipur"]);
    expect(contactFieldValue("firstName", { name: "Vidit Jain" })).toBe("Vidit");
  });

  it("surfaces Insufficient Balance and Meta 131049", () => {
    const balance = interpretOfficialWaSend({
      ok: true,
      http: 200,
      body: {
        error: {
          code: 0,
          title: "Insufficient Balance",
          message: "Not enough balance to send the message.",
        },
      },
    });
    expect(balance.ok).toBe(false);
    expect(balance.insufficientBalance).toBe(true);
    expect(balance.pauseCampaign).toBe(true);

    const blocked = interpretOfficialWaSend({
      ok: false,
      http: 400,
      body: {
        title: "Meta send message error",
        error: { code: 131049, message: "Engagement" },
      },
    });
    expect(blocked.marketingEngagementBlock).toBe(true);
    expect(blocked.error).toContain("131049");
    expect(
      officialWaSendUserMessage({
        insufficientBalance: false,
        marketingEngagementBlock: true,
        error: "x",
      }),
    ).toMatch(/UTILITY/i);
  });
});
