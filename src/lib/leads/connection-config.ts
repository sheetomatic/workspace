import { createHash, randomBytes } from "crypto";
import { maskSecret } from "@/lib/whatsapp-settings-form";

export type MetaLeadAdsConfig = {
  pageId: string;
  pageAccessToken: string;
  verifyToken: string;
  /** Optional comma-separated form IDs; empty = all forms on the page. */
  formIds: string[];
  appSecret?: string;
};

export type TelegramLeadConfig = {
  botToken: string;
  /** Public webhook path secret (plain only at create time). */
  webhookSecret: string;
};

export type IndiaMartLeadConfig = {
  glusrCrmKey: string;
  webhookSecret: string;
};

export type TradeIndiaLeadConfig = {
  userId: string;
  profileId: string;
  apiKey: string;
  webhookSecret: string;
};

export type ShopifyLeadConfig = {
  shopDomain: string;
  accessToken: string;
  apiSecret?: string;
  webhookSecret: string;
};

export type WooCommerceLeadConfig = {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  webhookSecret: string;
};

export type JustdialLeadConfig = {
  webhookSecret: string;
};

export const VOICE_PROVIDERS = ["EXOTEL", "TWILIO", "KNOWLARITY"] as const;
export type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

export type VoiceLeadConfig = {
  provider: VoiceProvider;
  clinicName: string;
  webhookSecret: string;
  openaiApiKey?: string;
  exotelSid?: string;
  exotelApiKey?: string;
  exotelApiToken?: string;
  exotelSubdomain?: string;
  exotelCallerId?: string;
  exotelAppId?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  knowlarityApiKey?: string;
  knowlarityAuth?: string;
  knowlarityKNumber?: string;
  knowlarityAgentNumber?: string;
};

export type LeadSourceStatus = "connected" | "needs_setup" | "error" | "disabled";

export function asConfigRecord(
  config: unknown,
): Record<string, unknown> {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

export function readString(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "string" ? value.trim() : "";
}

export function parseFormIds(raw: string | string[] | undefined): string[] {
  if (Array.isArray(raw)) {
    return raw.map((id) => String(id).trim()).filter(Boolean);
  }
  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }
  return raw
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

export function parseMetaLeadAdsConfig(config: unknown): MetaLeadAdsConfig | null {
  const record = asConfigRecord(config);
  const pageId = readString(record, "pageId");
  const pageAccessToken = readString(record, "pageAccessToken");
  const verifyToken = readString(record, "verifyToken");
  if (!pageId || !pageAccessToken || !verifyToken) {
    return null;
  }
  return {
    pageId,
    pageAccessToken,
    verifyToken,
    formIds: parseFormIds(
      (record.formIds as string | string[] | undefined) ??
        readString(record, "formIds"),
    ),
    appSecret: readString(record, "appSecret") || undefined,
  };
}

export function parseTelegramLeadConfig(config: unknown): TelegramLeadConfig | null {
  const record = asConfigRecord(config);
  const botToken = readString(record, "botToken");
  const webhookSecret = readString(record, "webhookSecret");
  if (!botToken || !webhookSecret) {
    return null;
  }
  return { botToken, webhookSecret };
}

export function parseIndiaMartLeadConfig(config: unknown): IndiaMartLeadConfig | null {
  const record = asConfigRecord(config);
  const glusrCrmKey =
    readString(record, "glusrCrmKey") || readString(record, "glusr_crm_key");
  const webhookSecret = readString(record, "webhookSecret");
  if (!glusrCrmKey || !webhookSecret) {
    return null;
  }
  return { glusrCrmKey, webhookSecret };
}

export function parseTradeIndiaLeadConfig(config: unknown): TradeIndiaLeadConfig | null {
  const record = asConfigRecord(config);
  const userId = readString(record, "userId") || readString(record, "userid");
  const profileId =
    readString(record, "profileId") || readString(record, "profile_id");
  const apiKey = readString(record, "apiKey") || readString(record, "key");
  const webhookSecret = readString(record, "webhookSecret");
  if (!userId || !profileId || !apiKey || !webhookSecret) {
    return null;
  }
  return { userId, profileId, apiKey, webhookSecret };
}

/** Pull can run before the webhook secret exists (key-only save). */
export function parseIndiaMartPullConfig(config: unknown): { glusrCrmKey: string } | null {
  const record = asConfigRecord(config);
  const glusrCrmKey =
    readString(record, "glusrCrmKey") || readString(record, "glusr_crm_key");
  if (!glusrCrmKey) {
    return null;
  }
  return { glusrCrmKey };
}

export function parseTradeIndiaPullConfig(config: unknown): {
  userId: string;
  profileId: string;
  apiKey: string;
} | null {
  const record = asConfigRecord(config);
  const userId = readString(record, "userId") || readString(record, "userid");
  const profileId =
    readString(record, "profileId") || readString(record, "profile_id");
  const apiKey = readString(record, "apiKey") || readString(record, "key");
  if (!userId || !profileId || !apiKey) {
    return null;
  }
  return { userId, profileId, apiKey };
}

export function normalizeShopifyShopDomain(raw: string) {
  let value = raw.trim().toLowerCase().replace(/^https?:\/\//, "");
  value = value.split("/")[0] ?? value;
  return value.replace(/\/$/, "");
}

export function parseShopifyLeadConfig(config: unknown): ShopifyLeadConfig | null {
  const record = asConfigRecord(config);
  const shopDomain = normalizeShopifyShopDomain(
    readString(record, "shopDomain") || readString(record, "shop"),
  );
  const accessToken = readString(record, "accessToken");
  const webhookSecret = readString(record, "webhookSecret");
  if (!shopDomain || !accessToken || !webhookSecret) {
    return null;
  }
  return {
    shopDomain,
    accessToken,
    apiSecret: readString(record, "apiSecret") || undefined,
    webhookSecret,
  };
}

export function parseShopifyPullConfig(config: unknown): {
  shopDomain: string;
  accessToken: string;
  apiSecret?: string;
} | null {
  const record = asConfigRecord(config);
  const shopDomain = normalizeShopifyShopDomain(
    readString(record, "shopDomain") || readString(record, "shop"),
  );
  const accessToken = readString(record, "accessToken");
  if (!shopDomain || !accessToken) {
    return null;
  }
  return {
    shopDomain,
    accessToken,
    apiSecret: readString(record, "apiSecret") || undefined,
  };
}

export function normalizeWooStoreUrl(raw: string) {
  let value = raw.trim().replace(/\/$/, "");
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  return value.replace(/\/$/, "");
}

export function parseWooCommerceLeadConfig(
  config: unknown,
): WooCommerceLeadConfig | null {
  const record = asConfigRecord(config);
  const storeUrl = normalizeWooStoreUrl(
    readString(record, "storeUrl") || readString(record, "url"),
  );
  const consumerKey = readString(record, "consumerKey");
  const consumerSecret = readString(record, "consumerSecret");
  const webhookSecret = readString(record, "webhookSecret");
  if (!storeUrl || !consumerKey || !consumerSecret || !webhookSecret) {
    return null;
  }
  return { storeUrl, consumerKey, consumerSecret, webhookSecret };
}

export function parseWooCommercePullConfig(config: unknown): {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
} | null {
  const record = asConfigRecord(config);
  const storeUrl = normalizeWooStoreUrl(
    readString(record, "storeUrl") || readString(record, "url"),
  );
  const consumerKey = readString(record, "consumerKey");
  const consumerSecret = readString(record, "consumerSecret");
  if (!storeUrl || !consumerKey || !consumerSecret) {
    return null;
  }
  return { storeUrl, consumerKey, consumerSecret };
}

export function parseJustdialLeadConfig(config: unknown): JustdialLeadConfig | null {
  const record = asConfigRecord(config);
  const webhookSecret = readString(record, "webhookSecret");
  if (!webhookSecret) {
    return null;
  }
  return { webhookSecret };
}

export function parseVoiceProvider(
  value: string | null | undefined,
): VoiceProvider | null {
  const normalized = value?.trim().toUpperCase();
  if (
    normalized === "EXOTEL" ||
    normalized === "TWILIO" ||
    normalized === "KNOWLARITY"
  ) {
    return normalized;
  }
  return null;
}

function optionalVoiceField(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  return readString(record, key) || undefined;
}

export function isVoiceProviderReady(config: {
  provider: VoiceProvider;
  exotelSid?: string;
  exotelApiKey?: string;
  exotelApiToken?: string;
  exotelCallerId?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  knowlarityApiKey?: string;
  knowlarityKNumber?: string;
}): boolean {
  if (config.provider === "EXOTEL") {
    return Boolean(
      config.exotelSid &&
        config.exotelApiKey &&
        config.exotelApiToken &&
        config.exotelCallerId,
    );
  }
  if (config.provider === "TWILIO") {
    return Boolean(
      config.twilioAccountSid &&
        config.twilioAuthToken &&
        config.twilioFromNumber,
    );
  }
  return Boolean(config.knowlarityApiKey && config.knowlarityKNumber);
}

export function parseVoiceProviderConfig(
  config: unknown,
): Omit<VoiceLeadConfig, "webhookSecret"> | null {
  const record = asConfigRecord(config);
  const provider = parseVoiceProvider(
    readString(record, "provider") || readString(record, "voiceProvider"),
  );
  if (!provider) {
    return null;
  }
  const parsed = {
    provider,
    clinicName: readString(record, "clinicName") || "the clinic",
    openaiApiKey: optionalVoiceField(record, "openaiApiKey"),
    exotelSid: optionalVoiceField(record, "exotelSid"),
    exotelApiKey: optionalVoiceField(record, "exotelApiKey"),
    exotelApiToken: optionalVoiceField(record, "exotelApiToken"),
    exotelSubdomain:
      optionalVoiceField(record, "exotelSubdomain") || "api.exotel.com",
    exotelCallerId: optionalVoiceField(record, "exotelCallerId"),
    exotelAppId: optionalVoiceField(record, "exotelAppId"),
    twilioAccountSid: optionalVoiceField(record, "twilioAccountSid"),
    twilioAuthToken: optionalVoiceField(record, "twilioAuthToken"),
    twilioFromNumber: optionalVoiceField(record, "twilioFromNumber"),
    knowlarityApiKey: optionalVoiceField(record, "knowlarityApiKey"),
    knowlarityAuth: optionalVoiceField(record, "knowlarityAuth"),
    knowlarityKNumber: optionalVoiceField(record, "knowlarityKNumber"),
    knowlarityAgentNumber: optionalVoiceField(record, "knowlarityAgentNumber"),
  };
  if (!isVoiceProviderReady(parsed)) {
    return null;
  }
  return parsed;
}

export function parseVoiceLeadConfig(config: unknown): VoiceLeadConfig | null {
  const providerConfig = parseVoiceProviderConfig(config);
  const webhookSecret = readString(asConfigRecord(config), "webhookSecret");
  if (!providerConfig || !webhookSecret) {
    return null;
  }
  return { ...providerConfig, webhookSecret };
}

export function hashLeadWebhookSecret(secret: string) {
  return createHash("sha256").update(secret.trim()).digest("hex");
}

export function generateLeadWebhookSecret(prefix = "lwh") {
  const raw = `${prefix}_${randomBytes(24).toString("hex")}`;
  return {
    secret: raw,
    hash: hashLeadWebhookSecret(raw),
    hint: raw.slice(-4),
  };
}

export function generateMetaVerifyToken() {
  return `meta_vt_${randomBytes(16).toString("hex")}`;
}

export function maskTokenHint(value: string | null | undefined) {
  const masked = maskSecret(value);
  return masked || null;
}

export function publicSiteUrl() {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (site) {
    return site;
  }
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/\/$/, "");
  if (vercelHost) {
    return `https://${vercelHost}`;
  }
  return "https://sheetomatic.com";
}

export function metaLeadWebhookUrl() {
  return `${publicSiteUrl()}/api/webhooks/meta/leads`;
}

export function telegramLeadWebhookUrl(webhookSecret: string) {
  return `${publicSiteUrl()}/api/webhooks/telegram/leads/${encodeURIComponent(webhookSecret)}`;
}

export function indiaMartLeadWebhookUrl(webhookSecret: string) {
  return `${publicSiteUrl()}/api/webhooks/indiamart/leads/${encodeURIComponent(webhookSecret)}`;
}

export function tradeIndiaLeadWebhookUrl(webhookSecret: string) {
  return `${publicSiteUrl()}/api/webhooks/tradeindia/leads/${encodeURIComponent(webhookSecret)}`;
}

export function shopifyLeadWebhookUrl(webhookSecret: string) {
  return `${publicSiteUrl()}/api/webhooks/shopify/leads/${encodeURIComponent(webhookSecret)}`;
}

export function wooCommerceLeadWebhookUrl(webhookSecret: string) {
  return `${publicSiteUrl()}/api/webhooks/woocommerce/leads/${encodeURIComponent(webhookSecret)}`;
}

export function justdialLeadWebhookUrl(webhookSecret: string) {
  return `${publicSiteUrl()}/api/webhooks/justdial/leads/${encodeURIComponent(webhookSecret)}`;
}

export function voiceLeadWebhookUrl(webhookSecret: string) {
  return `${publicSiteUrl()}/api/webhooks/voice/leads/${encodeURIComponent(webhookSecret)}`;
}

export function voiceLeadTwimlUrl(webhookSecret: string) {
  return `${voiceLeadWebhookUrl(webhookSecret)}/twiml`;
}

export function shopifyApiVersion() {
  return process.env.SHOPIFY_API_VERSION?.trim() || "2025-01";
}

export function metaGraphVersion() {
  return process.env.META_GRAPH_API_VERSION?.trim() || "v21.0";
}
