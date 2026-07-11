import type { LeadSourceChannel } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  asConfigRecord,
  generateLeadWebhookSecret,
  generateMetaVerifyToken,
  hashLeadWebhookSecret,
  maskTokenHint,
  metaLeadWebhookUrl,
  parseMetaLeadAdsConfig,
  parseTelegramLeadConfig,
  readString,
  telegramLeadWebhookUrl,
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

function isOfficialApiReady(
  credentials: Awaited<ReturnType<typeof resolveWorkspaceWhatsAppCredentials>>,
) {
  const phoneId = credentials.redlavaPhoneId?.trim();
  return Boolean(
    phoneId &&
      (credentials.metaAccessToken?.trim() || credentials.redlavaApiKey?.trim()),
  );
}

export async function getLeadSourceCardModels(
  organizationId: string,
): Promise<LeadSourceCardModel[]> {
  const [connections, waCredentials] = await Promise.all([
    prisma.leadIngestConnection.findMany({
      where: {
        organizationId,
        channel: { in: ["WHATSAPP", "FACEBOOK", "INSTAGRAM", "TELEGRAM"] },
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
