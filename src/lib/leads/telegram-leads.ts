import { prisma } from "@/lib/db";
import {
  hashLeadWebhookSecret,
  parseTelegramLeadConfig,
} from "@/lib/leads/connection-config";
import { ingestInboundLead } from "@/lib/leads/ingest";

export async function findTelegramConnectionByWebhookSecret(secret: string) {
  const hash = hashLeadWebhookSecret(secret);
  const byHash = await prisma.leadIngestConnection.findFirst({
    where: {
      channel: "TELEGRAM",
      enabled: true,
      ingestSecretHash: hash,
    },
    select: {
      id: true,
      organizationId: true,
      enabled: true,
      config: true,
      ingestSecretHash: true,
    },
  });
  if (byHash) {
    const config = parseTelegramLeadConfig(byHash.config);
    if (config) return { ...byHash, config };
  }

  // Legacy rows before ingestSecretHash was set — match config.webhookSecret.
  const rows = await prisma.leadIngestConnection.findMany({
    where: {
      channel: "TELEGRAM",
      enabled: true,
      ingestSecretHash: null,
    },
    select: {
      id: true,
      organizationId: true,
      enabled: true,
      config: true,
      ingestSecretHash: true,
    },
  });

  for (const row of rows) {
    const config = parseTelegramLeadConfig(row.config);
    if (config?.webhookSecret === secret) return { ...row, config };
  }
  return null;
}

function extractContactFromTelegramUpdate(update: Record<string, unknown>) {
  const message =
    (update.message as Record<string, unknown> | undefined) ??
    (update.edited_message as Record<string, unknown> | undefined) ??
    (update.channel_post as Record<string, unknown> | undefined);

  if (!message) {
    return null;
  }

  const from = message.from as Record<string, unknown> | undefined;
  const contact = message.contact as Record<string, unknown> | undefined;
  const text =
    typeof message.text === "string"
      ? message.text.trim()
      : typeof message.caption === "string"
        ? message.caption.trim()
        : null;

  const firstName =
    typeof from?.first_name === "string" ? from.first_name : null;
  const lastName = typeof from?.last_name === "string" ? from.last_name : null;
  const username = typeof from?.username === "string" ? from.username : null;
  const name =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    username ||
    (typeof contact?.first_name === "string" ? contact.first_name : null);

  const phoneFromContact =
    typeof contact?.phone_number === "string" ? contact.phone_number : null;
  const phoneFromText = text?.match(/\+?\d[\d\s-]{7,}\d/)?.[0] ?? null;
  const phone = phoneFromContact || phoneFromText;

  const chat = message.chat as Record<string, unknown> | undefined;
  const externalId =
    from?.id != null
      ? String(from.id)
      : chat?.id != null
        ? String(chat.id)
        : null;

  if (!phone && !externalId) {
    return null;
  }

  return {
    externalId: externalId ?? phone,
    name,
    phone,
    requirement: text,
    username,
  };
}

export async function processTelegramLeadUpdate(params: {
  webhookSecret: string;
  update: unknown;
}) {
  const connection = await findTelegramConnectionByWebhookSecret(
    params.webhookSecret,
  );
  if (!connection) {
    return { ok: false as const, reason: "unknown_webhook" as const };
  }

  if (!params.update || typeof params.update !== "object") {
    return { ok: false as const, reason: "invalid_payload" as const };
  }

  const contact = extractContactFromTelegramUpdate(
    params.update as Record<string, unknown>,
  );
  if (!contact) {
    return { ok: true as const, ignored: true as const };
  }

  const result = await ingestInboundLead({
    organizationId: connection.organizationId,
    channel: "TELEGRAM",
    connectionId: connection.id,
    skipConnectionSetup: true,
    externalId: contact.externalId,
    name: contact.name,
    phone: contact.phone,
    requirement: contact.requirement,
    sourceDetail: contact.username
      ? `Telegram @${contact.username}`
      : "Telegram bot",
    rawPayload: params.update as object,
    createFmsJob: true,
  });

  await prisma.leadIngestConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncError: result.lead ? null : "No phone on Telegram update",
      syncStatus: result.lead ? "IDLE" : "ERROR",
    },
  });

  return {
    ok: true as const,
    created: result.created,
    leadId: result.lead?.id ?? null,
  };
}

export async function setTelegramWebhook(params: {
  botToken: string;
  webhookUrl: string;
  secretToken?: string;
}) {
  const url = `https://api.telegram.org/bot${params.botToken.trim()}/setWebhook`;
  const body: Record<string, string> = {
    url: params.webhookUrl,
    allowed_updates: JSON.stringify(["message", "edited_message"]),
  };
  if (params.secretToken?.trim()) {
    body.secret_token = params.secretToken.trim();
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as {
    ok?: boolean;
    description?: string;
  };
  if (!response.ok || !json.ok) {
    return {
      ok: false as const,
      message: json.description ?? `Telegram setWebhook ${response.status}`,
    };
  }
  return { ok: true as const };
}

export async function verifyTelegramBotToken(botToken: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken.trim()}/getMe`,
  );
  const json = (await response.json()) as {
    ok?: boolean;
    result?: { username?: string; first_name?: string };
    description?: string;
  };
  if (!response.ok || !json.ok) {
    return {
      ok: false as const,
      message: json.description ?? `Telegram getMe ${response.status}`,
    };
  }
  return {
    ok: true as const,
    botUsername: json.result?.username ?? null,
    botName: json.result?.first_name ?? null,
  };
}
