import { describe, expect, it } from "vitest";
import {
  parseFormIds,
  parseMetaLeadAdsConfig,
  parseTelegramLeadConfig,
} from "@/lib/leads/connection-config";
import { isLeadSourceComingSoon } from "@/lib/leads/channels";

describe("lead source gates", () => {
  it("keeps live connectors out of coming-soon", () => {
    expect(isLeadSourceComingSoon("WHATSAPP")).toBe(false);
    expect(isLeadSourceComingSoon("FACEBOOK")).toBe(false);
    expect(isLeadSourceComingSoon("INSTAGRAM")).toBe(false);
    expect(isLeadSourceComingSoon("TELEGRAM")).toBe(false);
    expect(isLeadSourceComingSoon("MANUAL")).toBe(true);
  });
});

describe("connection-config parsers", () => {
  it("requires Meta pageId, token, verifyToken", () => {
    expect(
      parseMetaLeadAdsConfig({
        pageId: "123",
        pageAccessToken: "tok",
        verifyToken: "vt",
        formIds: "a, b",
      }),
    ).toEqual({
      pageId: "123",
      pageAccessToken: "tok",
      verifyToken: "vt",
      formIds: ["a", "b"],
      appSecret: undefined,
    });
    expect(parseMetaLeadAdsConfig({ pageId: "123" })).toBeNull();
  });

  it("parses form id lists", () => {
    expect(parseFormIds("1, 2 3")).toEqual(["1", "2", "3"]);
  });

  it("requires Telegram botToken + webhookSecret", () => {
    expect(
      parseTelegramLeadConfig({
        botToken: "123:ABC",
        webhookSecret: "tg_abc",
      }),
    ).toEqual({ botToken: "123:ABC", webhookSecret: "tg_abc" });
    expect(parseTelegramLeadConfig({ botToken: "123:ABC" })).toBeNull();
  });
});
