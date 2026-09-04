/**
 * Lead source connectors — FE contract (backend-owned).
 *
 * Settings page loads status via `getLeadSourceCardModels(organizationId)`.
 * Mutations live in `@/app/app/leads/actions` (session/org from server — never
 * pass organizationId from the client).
 *
 * Webhooks (no session):
 * - Meta Lead Ads: GET/POST `/api/webhooks/meta/leads`
 * - Telegram: POST `/api/webhooks/telegram/leads/{webhookSecret}`
 * - IndiaMART: POST `/api/webhooks/indiamart/leads/{webhookSecret}`
 * - TradeIndia (optional push): POST `/api/webhooks/tradeindia/leads/{webhookSecret}`
 * - Shopify: POST `/api/webhooks/shopify/leads/{webhookSecret}`
 * - WooCommerce: POST `/api/webhooks/woocommerce/leads/{webhookSecret}`
 * - Justdial: GET/POST `/api/webhooks/justdial/leads/{webhookSecret}`
 * - Voice / AI receptionist: POST `/api/webhooks/voice/leads/{webhookSecret}`
 *   (Twilio TwiML: `/api/webhooks/voice/leads/{webhookSecret}/twiml`)
 *
 * WhatsApp Official: inbound Meta Cloud → `/api/webhooks/whatsapp` →
 * `queueLeadSyncFromWhatsApp` when WHATSAPP connector is enabled.
 */

export type {
  LeadSourceCardModel,
} from "@/lib/leads/source-settings";

export {
  getLeadSourceCardModels,
  isOfficialApiReady,
} from "@/lib/leads/source-settings";

export {
  metaLeadWebhookUrl,
  telegramLeadWebhookUrl,
  indiaMartLeadWebhookUrl,
  tradeIndiaLeadWebhookUrl,
  shopifyLeadWebhookUrl,
  wooCommerceLeadWebhookUrl,
  justdialLeadWebhookUrl,
  voiceLeadWebhookUrl,
  voiceLeadTwimlUrl,
  type MetaLeadAdsConfig,
  type TelegramLeadConfig,
  type IndiaMartLeadConfig,
  type TradeIndiaLeadConfig,
  type ShopifyLeadConfig,
  type WooCommerceLeadConfig,
  type JustdialLeadConfig,
  type VoiceLeadConfig,
  type LeadSourceStatus,
} from "@/lib/leads/connection-config";

/** Fields FE must collect / display per live connector. */
export const LEAD_SOURCE_CONNECTOR_FIELDS = {
  WHATSAPP: {
    credentialsFrom: "/ai/app/settings#official-api",
    required: ["metaAccessToken", "phoneNumberId (redlavaPhoneId)"] as const,
    actions: ["setWhatsAppLeadIngestEnabled"] as const,
    webhookUrl: null,
  },
  FACEBOOK: {
    required: ["pageId", "pageAccessToken", "verifyToken"] as const,
    optional: ["formIds", "appSecret"] as const,
    actions: ["saveMetaLeadAdsConnection", "verifyMetaLeadAdsConnection"] as const,
    webhookPath: "/api/webhooks/meta/leads",
  },
  INSTAGRAM: {
    required: ["pageId", "pageAccessToken", "verifyToken"] as const,
    optional: ["formIds", "appSecret"] as const,
    note: "Lead Ads only (same Meta page webhook). Instagram DMs are not ingested.",
    actions: ["saveMetaLeadAdsConnection", "verifyMetaLeadAdsConnection"] as const,
    webhookPath: "/api/webhooks/meta/leads",
  },
  TELEGRAM: {
    required: ["botToken"] as const,
    generated: ["webhookSecret"] as const,
    actions: ["saveTelegramLeadConnection"] as const,
    webhookPath: "/api/webhooks/telegram/leads/{webhookSecret}",
  },
  INDIAMART: {
    required: ["glusrCrmKey"] as const,
    generated: ["webhookSecret"] as const,
    actions: ["saveIndiaMartLeadConnection", "verifyIndiaMartLeadConnection"] as const,
    webhookPath: "/api/webhooks/indiamart/leads/{webhookSecret}",
  },
  TRADEINDIA: {
    required: ["userId", "profileId", "apiKey"] as const,
    generated: ["webhookSecret"] as const,
    actions: ["saveTradeIndiaLeadConnection", "verifyTradeIndiaLeadConnection"] as const,
    webhookPath: "/api/webhooks/tradeindia/leads/{webhookSecret}",
  },
  SHOPIFY: {
    required: ["shopDomain", "accessToken"] as const,
    optional: ["apiSecret"] as const,
    generated: ["webhookSecret"] as const,
    actions: ["saveShopifyLeadConnection", "verifyShopifyLeadConnection"] as const,
    webhookPath: "/api/webhooks/shopify/leads/{webhookSecret}",
  },
  WOOCOMMERCE: {
    required: ["storeUrl", "consumerKey", "consumerSecret"] as const,
    generated: ["webhookSecret"] as const,
    actions: ["saveWooCommerceLeadConnection", "verifyWooCommerceLeadConnection"] as const,
    webhookPath: "/api/webhooks/woocommerce/leads/{webhookSecret}",
  },
  JUSTDIAL: {
    generated: ["webhookSecret"] as const,
    actions: ["saveJustdialLeadConnection"] as const,
    webhookPath: "/api/webhooks/justdial/leads/{webhookSecret}",
  },
  VOICE: {
    required: ["provider"] as const,
    optional: ["openaiApiKey", "clinicName"] as const,
    generated: ["webhookSecret"] as const,
    actions: [
      "saveVoiceLeadConnection",
      "verifyVoiceLeadConnectionAction",
      "startReceptionistCall",
    ] as const,
    webhookPath: "/api/webhooks/voice/leads/{webhookSecret}",
    note: "Exotel: apiKey, apiToken, sid, callerId. Twilio: accountSid, authToken, fromNumber. Knowlarity: apiKey, kNumber.",
  },
} as const;
