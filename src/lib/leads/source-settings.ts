import type { LeadSourceChannel } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  asConfigRecord,
  generateLeadWebhookSecret,
  generateMetaVerifyToken,
  hashLeadWebhookSecret,
  indiaMartLeadWebhookUrl,
  justdialLeadWebhookUrl,
  maskTokenHint,
  metaLeadWebhookUrl,
  parseIndiaMartLeadConfig,
  parseIndiaMartPullConfig,
  parseJustdialLeadConfig,
  parseMetaLeadAdsConfig,
  parseShopifyLeadConfig,
  parseShopifyPullConfig,
  parseTelegramLeadConfig,
  parseTradeIndiaLeadConfig,
  parseTradeIndiaPullConfig,
  parseVoiceLeadConfig,
  parseVoiceProviderConfig,
  parseWooCommerceLeadConfig,
  parseWooCommercePullConfig,
  readString,
  shopifyLeadWebhookUrl,
  telegramLeadWebhookUrl,
  tradeIndiaLeadWebhookUrl,
  voiceLeadTwimlUrl,
  voiceLeadWebhookUrl,
  wooCommerceLeadWebhookUrl,
  type LeadSourceStatus,
} from "@/lib/leads/connection-config";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

export type LeadSourceCardModel = {
  channel: LeadSourceChannel;
  label: string;
  description: string;
  enabled: boolean;
  status: LeadSourceStatus;
  statusLabel: string;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  webhookUrl: string | null;
  setupHref: string | null;
  fields: Record<string, string | boolean | null>;
};

function statusFrom(params: {
  enabled: boolean;
  ready: boolean;
  error: string | null;
}): { status: LeadSourceStatus; statusLabel: string } {
  if (params.error) {
    return { status: "error", statusLabel: "Error" };
  }
  if (!params.ready) {
    return { status: "needs_setup", statusLabel: "Needs setup" };
  }
  if (!params.enabled) {
    return { status: "disabled", statusLabel: "Ready · disabled" };
  }
  return { status: "connected", statusLabel: "Connected" };
}

/** Official API = Meta Cloud access token + phone number ID (not Web Based API alone). */
export function isOfficialApiReady(
  credentials: Awaited<ReturnType<typeof resolveWorkspaceWhatsAppCredentials>>,
) {
  const phoneId = credentials.redlavaPhoneId?.trim();
  return Boolean(phoneId && credentials.metaAccessToken?.trim());
}

export async function getLeadSourceCardModels(
  organizationId: string,
): Promise<LeadSourceCardModel[]> {
  const [connections, waCredentials] = await Promise.all([
    prisma.leadIngestConnection.findMany({
      where: {
        organizationId,
        channel: {
          in: [
            "WHATSAPP",
            "FACEBOOK",
            "INSTAGRAM",
            "TELEGRAM",
            "INDIAMART",
            "TRADEINDIA",
            "SHOPIFY",
            "WOOCOMMERCE",
            "JUSTDIAL",
            "VOICE",
          ],
        },
      },
    }),
    resolveWorkspaceWhatsAppCredentials(organizationId),
  ]);

  const byChannel = new Map(
    connections.map((row) => [row.channel, row] as const),
  );
  const officialReady = isOfficialApiReady(waCredentials);

  const cards: LeadSourceCardModel[] = [];

  const wa = byChannel.get("WHATSAPP");
  {
    const { status, statusLabel } = statusFrom({
      enabled: Boolean(wa?.enabled),
      ready: officialReady,
      error: wa?.lastSyncError ?? null,
    });
    cards.push({
      channel: "WHATSAPP",
      label: "WhatsApp (Official API)",
      description:
        "Inbound chats on your Official API number create Leads Machine rows when this connector is enabled. Nurture outbound still uses Web Based API credentials above.",
      enabled: Boolean(wa?.enabled),
      status: officialReady ? status : "needs_setup",
      statusLabel: officialReady ? statusLabel : "Needs Official API",
      lastSyncAt: wa?.lastSyncAt?.toISOString() ?? null,
      lastSyncError: wa?.lastSyncError ?? null,
      webhookUrl: null,
      setupHref: "/ai/app/settings#official-api",
      fields: {
        phoneNumberIdHint: maskTokenHint(waCredentials.redlavaPhoneId),
        hasMetaToken: Boolean(waCredentials.metaAccessToken),
        businessPhone: waCredentials.businessPhone,
      },
    });
  }

  for (const channel of ["FACEBOOK", "INSTAGRAM"] as const) {
    const row = byChannel.get(channel);
    const config = parseMetaLeadAdsConfig(row?.config);
    const record = asConfigRecord(row?.config);
    const ready = Boolean(config);
    const { status, statusLabel } = statusFrom({
      enabled: Boolean(row?.enabled),
      ready,
      error: row?.lastSyncError ?? null,
    });
    cards.push({
      channel,
      label:
        channel === "FACEBOOK"
          ? "Facebook Lead Ads"
          : "Instagram Lead Ads",
      description:
        channel === "FACEBOOK"
          ? "Meta leadgen webhook → Graph lead details → InboundLead (FACEBOOK)."
          : "Lead Ads via the same Meta page webhook (INSTAGRAM). Instagram DMs are not included yet.",
      enabled: Boolean(row?.enabled),
      status: ready ? status : "needs_setup",
      statusLabel: ready ? statusLabel : "Needs setup",
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      lastSyncError: row?.lastSyncError ?? null,
      webhookUrl: metaLeadWebhookUrl(),
      setupHref: null,
      fields: {
        pageId: config?.pageId ?? (readString(record, "pageId") || null),
        pageAccessTokenHint: maskTokenHint(
          config?.pageAccessToken ?? readString(record, "pageAccessToken"),
        ),
        verifyToken:
          config?.verifyToken ?? (readString(record, "verifyToken") || null),
        formIds: (config?.formIds ?? []).join(", ") || null,
        hasAppSecret: Boolean(
          config?.appSecret ?? readString(record, "appSecret"),
        ),
      },
    });
  }

  {
    const row = byChannel.get("TELEGRAM");
    const config = parseTelegramLeadConfig(row?.config);
    const record = asConfigRecord(row?.config);
    const ready = Boolean(config);
    const webhookSecret =
      config?.webhookSecret ?? readString(record, "webhookSecret");
    const { status, statusLabel } = statusFrom({
      enabled: Boolean(row?.enabled),
      ready,
      error: row?.lastSyncError ?? null,
    });
    cards.push({
      channel: "TELEGRAM",
      label: "Telegram Bot",
      description:
        "Bot API webhook intake. Messages with a phone (contact share or text) become leads.",
      enabled: Boolean(row?.enabled),
      status: ready ? status : "needs_setup",
      statusLabel: ready ? statusLabel : "Needs setup",
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      lastSyncError: row?.lastSyncError ?? null,
      webhookUrl: webhookSecret
        ? telegramLeadWebhookUrl(webhookSecret)
        : null,
      setupHref: null,
      fields: {
        botTokenHint: maskTokenHint(
          config?.botToken ?? readString(record, "botToken"),
        ),
        webhookSecretHint: maskTokenHint(webhookSecret),
        botUsername: readString(record, "botUsername") || null,
      },
    });
  }

  {
    const row = byChannel.get("INDIAMART");
    const config = parseIndiaMartLeadConfig(row?.config);
    const pull = parseIndiaMartPullConfig(row?.config);
    const record = asConfigRecord(row?.config);
    const webhookSecret =
      config?.webhookSecret ?? readString(record, "webhookSecret");
    const ready = Boolean(pull);
    const { status, statusLabel } = statusFrom({
      enabled: Boolean(row?.enabled),
      ready,
      error: row?.lastSyncError ?? null,
    });
    cards.push({
      channel: "INDIAMART",
      label: "IndiaMART",
      description:
        "Paste your Lead Manager Pull API key. Enable to pull enquiries and receive Push API posts on the webhook URL.",
      enabled: Boolean(row?.enabled),
      status: ready ? status : "needs_setup",
      statusLabel: ready ? statusLabel : "Needs setup",
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      lastSyncError: row?.lastSyncError ?? null,
      webhookUrl: webhookSecret ? indiaMartLeadWebhookUrl(webhookSecret) : null,
      setupHref: null,
      fields: {
        glusrCrmKeyHint: maskTokenHint(
          pull?.glusrCrmKey ?? readString(record, "glusrCrmKey"),
        ),
        webhookSecretHint: maskTokenHint(webhookSecret),
      },
    });
  }

  {
    const row = byChannel.get("TRADEINDIA");
    const config = parseTradeIndiaLeadConfig(row?.config);
    const pull = parseTradeIndiaPullConfig(row?.config);
    const record = asConfigRecord(row?.config);
    const webhookSecret =
      config?.webhookSecret ?? readString(record, "webhookSecret");
    const ready = Boolean(pull);
    const { status, statusLabel } = statusFrom({
      enabled: Boolean(row?.enabled),
      ready,
      error: row?.lastSyncError ?? null,
    });
    cards.push({
      channel: "TRADEINDIA",
      label: "TradeIndia",
      description:
        "Paste userid, profile id, and Inquiry API key from My Inquiry API. Cron pulls new enquiries after you save and enable.",
      enabled: Boolean(row?.enabled),
      status: ready ? status : "needs_setup",
      statusLabel: ready ? statusLabel : "Needs setup",
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      lastSyncError: row?.lastSyncError ?? null,
      webhookUrl: webhookSecret ? tradeIndiaLeadWebhookUrl(webhookSecret) : null,
      setupHref: null,
      fields: {
        userId: pull?.userId ?? (readString(record, "userId") || null),
        profileId: pull?.profileId ?? (readString(record, "profileId") || null),
        apiKeyHint: maskTokenHint(pull?.apiKey ?? readString(record, "apiKey")),
        webhookSecretHint: maskTokenHint(webhookSecret),
      },
    });
  }

  {
    const row = byChannel.get("SHOPIFY");
    const config = parseShopifyLeadConfig(row?.config);
    const pull = parseShopifyPullConfig(row?.config);
    const record = asConfigRecord(row?.config);
    const webhookSecret =
      config?.webhookSecret ?? readString(record, "webhookSecret");
    const ready = Boolean(pull);
    const { status, statusLabel } = statusFrom({
      enabled: Boolean(row?.enabled),
      ready,
      error: row?.lastSyncError ?? null,
    });
    cards.push({
      channel: "SHOPIFY",
      label: "Shopify",
      description:
        "Custom app Admin API token for your shop. Save & enable registers orders/create and customers/create webhooks, then pulls recent orders.",
      enabled: Boolean(row?.enabled),
      status: ready ? status : "needs_setup",
      statusLabel: ready ? statusLabel : "Needs setup",
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      lastSyncError: row?.lastSyncError ?? null,
      webhookUrl: webhookSecret ? shopifyLeadWebhookUrl(webhookSecret) : null,
      setupHref: null,
      fields: {
        shopDomain: pull?.shopDomain ?? (readString(record, "shopDomain") || null),
        accessTokenHint: maskTokenHint(
          pull?.accessToken ?? readString(record, "accessToken"),
        ),
        hasApiSecret: Boolean(pull?.apiSecret ?? readString(record, "apiSecret")),
        webhookSecretHint: maskTokenHint(webhookSecret),
      },
    });
  }

  {
    const row = byChannel.get("WOOCOMMERCE");
    const config = parseWooCommerceLeadConfig(row?.config);
    const pull = parseWooCommercePullConfig(row?.config);
    const record = asConfigRecord(row?.config);
    const webhookSecret =
      config?.webhookSecret ?? readString(record, "webhookSecret");
    const ready = Boolean(pull);
    const { status, statusLabel } = statusFrom({
      enabled: Boolean(row?.enabled),
      ready,
      error: row?.lastSyncError ?? null,
    });
    cards.push({
      channel: "WOOCOMMERCE",
      label: "WooCommerce",
      description:
        "REST API consumer key + secret from WooCommerce → Settings → Advanced → REST API. Save & enable registers order.created.",
      enabled: Boolean(row?.enabled),
      status: ready ? status : "needs_setup",
      statusLabel: ready ? statusLabel : "Needs setup",
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      lastSyncError: row?.lastSyncError ?? null,
      webhookUrl: webhookSecret
        ? wooCommerceLeadWebhookUrl(webhookSecret)
        : null,
      setupHref: null,
      fields: {
        storeUrl: pull?.storeUrl ?? (readString(record, "storeUrl") || null),
        consumerKeyHint: maskTokenHint(
          pull?.consumerKey ?? readString(record, "consumerKey"),
        ),
        hasConsumerSecret: Boolean(
          pull?.consumerSecret ?? readString(record, "consumerSecret"),
        ),
        webhookSecretHint: maskTokenHint(webhookSecret),
      },
    });
  }

  {
    const row = byChannel.get("JUSTDIAL");
    const config = parseJustdialLeadConfig(row?.config);
    const record = asConfigRecord(row?.config);
    const webhookSecret =
      config?.webhookSecret ?? readString(record, "webhookSecret");
    const ready = Boolean(webhookSecret);
    const { status, statusLabel } = statusFrom({
      enabled: Boolean(row?.enabled),
      ready,
      error: row?.lastSyncError ?? null,
    });
    cards.push({
      channel: "JUSTDIAL",
      label: "Justdial",
      description:
        "Save to generate a webhook URL, then send it to your Justdial account manager (GET). No Sheetomatic-held Justdial key.",
      enabled: Boolean(row?.enabled),
      status: ready ? status : "needs_setup",
      statusLabel: ready ? statusLabel : "Needs setup",
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      lastSyncError: row?.lastSyncError ?? null,
      webhookUrl: webhookSecret ? justdialLeadWebhookUrl(webhookSecret) : null,
      setupHref: null,
      fields: {
        webhookSecretHint: maskTokenHint(webhookSecret),
      },
    });
  }

  {
    const row = byChannel.get("VOICE");
    const config = parseVoiceLeadConfig(row?.config);
    const providerConfig = parseVoiceProviderConfig(row?.config);
    const record = asConfigRecord(row?.config);
    const webhookSecret =
      config?.webhookSecret ?? readString(record, "webhookSecret");
    const ready = Boolean(providerConfig && webhookSecret);
    const { status, statusLabel } = statusFrom({
      enabled: Boolean(row?.enabled),
      ready,
      error: row?.lastSyncError ?? null,
    });
    const provider =
      config?.provider ??
      providerConfig?.provider ??
      (readString(record, "provider") || "EXOTEL");
    cards.push({
      channel: "VOICE",
      label: "AI receptionist (voice)",
      description:
        "Calls the patient, confirms the visit, then writes into this workspace’s CRM. Paste Exotel, Twilio, or Knowlarity keys — no Sheetomatic-held voice credential.",
      enabled: Boolean(row?.enabled),
      status: ready ? status : "needs_setup",
      statusLabel: ready ? statusLabel : "Needs setup",
      lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
      lastSyncError: row?.lastSyncError ?? null,
      webhookUrl: webhookSecret ? voiceLeadWebhookUrl(webhookSecret) : null,
      setupHref: null,
      fields: {
        provider,
        clinicName: config?.clinicName ?? readString(record, "clinicName"),
        twimlUrl: webhookSecret ? voiceLeadTwimlUrl(webhookSecret) : null,
        hasOpenaiKey: Boolean(
          config?.openaiApiKey || readString(record, "openaiApiKey"),
        ),
        openaiApiKeyHint: maskTokenHint(
          config?.openaiApiKey ?? readString(record, "openaiApiKey"),
        ),
        exotelSidHint: maskTokenHint(
          config?.exotelSid ?? readString(record, "exotelSid"),
        ),
        exotelApiKeyHint: maskTokenHint(
          config?.exotelApiKey ?? readString(record, "exotelApiKey"),
        ),
        exotelSubdomain:
          config?.exotelSubdomain ??
          readString(record, "exotelSubdomain") ??
          "api.exotel.com",
        exotelCallerId:
          config?.exotelCallerId ?? readString(record, "exotelCallerId"),
        exotelAppId: config?.exotelAppId ?? readString(record, "exotelAppId"),
        twilioAccountSidHint: maskTokenHint(
          config?.twilioAccountSid ?? readString(record, "twilioAccountSid"),
        ),
        twilioFromNumber:
          config?.twilioFromNumber ?? readString(record, "twilioFromNumber"),
        knowlarityKNumber:
          config?.knowlarityKNumber ?? readString(record, "knowlarityKNumber"),
        knowlarityApiKeyHint: maskTokenHint(
          config?.knowlarityApiKey ?? readString(record, "knowlarityApiKey"),
        ),
        knowlarityAgentNumber:
          config?.knowlarityAgentNumber ??
          readString(record, "knowlarityAgentNumber"),
      },
    });
  }

  return cards;
}

export function defaultMetaVerifyTokenForOrg(existing: unknown) {
  const current = readString(asConfigRecord(existing), "verifyToken");
  return current || generateMetaVerifyToken();
}

export function ensureTelegramWebhookSecret(existing: unknown) {
  const current = parseTelegramLeadConfig(existing);
  if (current?.webhookSecret) {
    return {
      secret: current.webhookSecret,
      hash: hashLeadWebhookSecret(current.webhookSecret),
      reuse: true as const,
    };
  }
  const generated = generateLeadWebhookSecret("tg");
  return { secret: generated.secret, hash: generated.hash, reuse: false as const };
}
