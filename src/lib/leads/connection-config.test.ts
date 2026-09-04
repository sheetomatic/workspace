import { describe, expect, it } from "vitest";
import {
  parseFormIds,
  parseIndiaMartLeadConfig,
  parseIndiaMartPullConfig,
  parseJustdialLeadConfig,
  parseMetaLeadAdsConfig,
  parseShopifyLeadConfig,
  parseTelegramLeadConfig,
  parseTradeIndiaLeadConfig,
  parseWooCommerceLeadConfig,
  normalizeShopifyShopDomain,
  normalizeWooStoreUrl,
} from "@/lib/leads/connection-config";
import { isLeadSourceComingSoon } from "@/lib/leads/channels";
import {
  extractIndiaMartLeadRecords,
  formatIndiaMartTimestamp,
  mapIndiaMartLeadRecord,
} from "@/lib/leads/indiamart";
import { extractTradeIndiaLeadRecords } from "@/lib/leads/tradeindia";
import { mapShopifyOrder, mapShopifyCustomer } from "@/lib/leads/shopify";
import { mapWooCommerceOrder } from "@/lib/leads/woocommerce";
import { mapJustdialLeadRecord } from "@/lib/leads/justdial";

describe("lead source gates", () => {
  it("keeps live connectors out of coming-soon", () => {
    expect(isLeadSourceComingSoon("WHATSAPP")).toBe(false);
    expect(isLeadSourceComingSoon("FACEBOOK")).toBe(false);
    expect(isLeadSourceComingSoon("INDIAMART")).toBe(false);
    expect(isLeadSourceComingSoon("TRADEINDIA")).toBe(false);
    expect(isLeadSourceComingSoon("SHOPIFY")).toBe(false);
    expect(isLeadSourceComingSoon("WOOCOMMERCE")).toBe(false);
    expect(isLeadSourceComingSoon("JUSTDIAL")).toBe(false);
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

  it("parses IndiaMART pull key without webhook secret", () => {
    expect(parseIndiaMartPullConfig({ glusrCrmKey: "im-key" })).toEqual({
      glusrCrmKey: "im-key",
    });
    expect(
      parseIndiaMartLeadConfig({ glusrCrmKey: "im-key", webhookSecret: "im_x" }),
    ).toEqual({ glusrCrmKey: "im-key", webhookSecret: "im_x" });
  });

  it("parses TradeIndia credentials", () => {
    expect(
      parseTradeIndiaLeadConfig({
        userId: "1",
        profileId: "2",
        apiKey: "k",
        webhookSecret: "ti_x",
      }),
    ).toMatchObject({ userId: "1", profileId: "2", apiKey: "k" });
  });

  it("normalizes Shopify shop domain", () => {
    expect(normalizeShopifyShopDomain("https://Acme.myshopify.com/admin")).toBe(
      "acme.myshopify.com",
    );
    expect(
      parseShopifyLeadConfig({
        shopDomain: "acme.myshopify.com",
        accessToken: "shpat_1",
        webhookSecret: "sh_x",
      }),
    ).toMatchObject({ shopDomain: "acme.myshopify.com", accessToken: "shpat_1" });
  });

  it("normalizes WooCommerce store URL", () => {
    expect(normalizeWooStoreUrl("shop.example.com/")).toBe("https://shop.example.com");
    expect(
      parseWooCommerceLeadConfig({
        storeUrl: "https://shop.example.com",
        consumerKey: "ck",
        consumerSecret: "cs",
        webhookSecret: "wc_x",
      }),
    ).toMatchObject({ storeUrl: "https://shop.example.com" });
  });

  it("parses Justdial webhook-only config", () => {
    expect(parseJustdialLeadConfig({ webhookSecret: "jd_x" })).toEqual({
      webhookSecret: "jd_x",
    });
    expect(parseJustdialLeadConfig({})).toBeNull();
  });
});

describe("IndiaMART mapping", () => {
  it("maps UNIQUE_QUERY_ID and sender fields from a push envelope", () => {
    const leads = extractIndiaMartLeadRecords({
      body: {
        CODE: 200,
        RESPONSE: {
          UNIQUE_QUERY_ID: "621654886",
          QUERY_TYPE: "B",
          QUERY_TIME: "2024-04-10 11:17:14",
          SENDER_NAME: "Prabhat",
          SENDER_MOBILE: "+91-9999999999",
          SENDER_EMAIL: "a@b.com",
          SENDER_CITY: "Noida",
          SENDER_COMPANY: "ABC Pvt Ltd.",
          QUERY_PRODUCT_NAME: "Mineral Water Bottle",
          QUERY_MESSAGE: "Need 100000 pieces",
        },
      },
    });
    expect(leads).toHaveLength(1);
    expect(leads[0]?.externalId).toBe("621654886");
    expect(leads[0]?.phone).toBe("+91-9999999999");
    expect(leads[0]?.city).toBe("Noida");
    expect(leads[0]?.requirement).toContain("Mineral Water Bottle");
  });

  it("returns null without UNIQUE_QUERY_ID", () => {
    expect(mapIndiaMartLeadRecord({ SENDER_NAME: "x" })).toBeNull();
  });

  it("formats Pull API start_time as DD-MMM-YYYY HH:MM:SS IST", () => {
    expect(formatIndiaMartTimestamp(new Date("2024-04-10T05:47:14.000Z"))).toBe(
      "10-Apr-2024 11:17:14",
    );
  });
});

describe("TradeIndia mapping", () => {
  it("maps rfi_id from an inquiry array", () => {
    const leads = extractTradeIndiaLeadRecords([
      {
        rfi_id: "99",
        sender_name: "Ravi",
        sender_mobile: "9876543210",
        sender_city: "Pune",
        sender_co: "Ravi Furniture",
        product_name: "Office chairs",
        message: "Need 20 chairs",
      },
    ]);
    expect(leads[0]?.externalId).toBe("99");
    expect(leads[0]?.company).toBe("Ravi Furniture");
    expect(leads[0]?.phone).toBe("9876543210");
  });
});

describe("Shopify mapping", () => {
  it("maps an order to CRM fields", () => {
    const mapped = mapShopifyOrder({
      id: 101,
      name: "#1001",
      email: "buyer@example.com",
      phone: "919111111111",
      total_price: "2500.00",
      billing_address: { city: "Jaipur", company: "Kala Boutique", first_name: "Meera" },
      line_items: [{ title: "Silk kurta" }],
    });
    expect(mapped?.externalId).toBe("order:101");
    expect(mapped?.phone).toBe("919111111111");
    expect(mapped?.city).toBe("Jaipur");
    expect(mapped?.requirement).toContain("Silk kurta");
    expect(mapped?.pipeValue).toBe(2500);
  });

  it("maps a customer", () => {
    const mapped = mapShopifyCustomer({
      id: 7,
      first_name: "Amit",
      last_name: "Shah",
      email: "amit@example.com",
      phone: "9800000000",
    });
    expect(mapped?.externalId).toBe("customer:7");
    expect(mapped?.name).toBe("Amit Shah");
  });
});

describe("WooCommerce mapping", () => {
  it("maps billing fields from an order", () => {
    const mapped = mapWooCommerceOrder({
      id: 55,
      number: "55",
      total: "899",
      billing: {
        first_name: "Neha",
        last_name: "Jain",
        phone: "9123456789",
        email: "neha@example.com",
        city: "Indore",
        company: "Jain Jewels",
      },
      line_items: [{ name: "Gold chain" }],
    });
    expect(mapped?.externalId).toBe("order:55");
    expect(mapped?.name).toBe("Neha Jain");
    expect(mapped?.company).toBe("Jain Jewels");
    expect(mapped?.requirement).toContain("Gold chain");
  });
});

describe("Justdial mapping", () => {
  it("maps GET query-style lead fields", () => {
    const mapped = mapJustdialLeadRecord({
      leadid: "JD99",
      name: "Suresh",
      mobile: "9988776655",
      email: "s@example.com",
      city: "Surat",
      category: "Mobile shop",
      company: "Suresh Mobiles",
    });
    expect(mapped?.externalId).toBe("JD99");
    expect(mapped?.phone).toBe("9988776655");
    expect(mapped?.sourceDetail).toContain("Mobile shop");
  });
});
