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
  type MetaLeadAdsConfig,
  type TelegramLeadConfig,
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
} as const;
