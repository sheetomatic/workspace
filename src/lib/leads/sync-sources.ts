import type { LeadSourceChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ingestInboundLead } from "@/lib/leads/ingest";

export type ExternalLeadRow = {
  externalId: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  requirement?: string | null;
  sourceDetail?: string | null;
  raw?: Record<string, unknown>;
};

/**
 * Pull leads from an external API configured on LeadIngestConnection.config.
 * Expected config shape (you will provide real API details):
 * {
 *   "apiUrl": "https://...",
 *   "apiKey": "...",
 *   "headers": { "Authorization": "Bearer ..." },
 *   "rowsPath": "data.leads"
 * }
 */
export async function pullLeadsFromConnection(params: {
  organizationId: string;
  channel: LeadSourceChannel;
}) {
  const connection = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId: params.organizationId,
        channel: params.channel,
      },
    },
  });

  if (!connection?.enabled) {
    return { ok: false as const, reason: "connection_disabled" };
  }

  const config = connection.config as Record<string, unknown>;
  const apiUrl = typeof config.apiUrl === "string" ? config.apiUrl.trim() : "";

  if (!apiUrl) {
    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "IDLE",
        lastSyncError: "API URL not configured yet. Add apiUrl in connection config.",
      },
    });
    return { ok: false as const, reason: "missing_api_url" };
  }

  await prisma.leadIngestConnection.update({
    where: { id: connection.id },
    data: { syncStatus: "SYNCING", lastSyncError: null },
  });

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (config.headers && typeof config.headers === "object") {
      Object.assign(headers, config.headers as Record<string, string>);
    }

    if (typeof config.apiKey === "string" && config.apiKey.trim()) {
      headers.Authorization = `Bearer ${config.apiKey.trim()}`;
    }

    const response = await fetch(apiUrl, { headers, cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Upstream API ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const rows = extractLeadRows(payload, config.rowsPath);

    let imported = 0;
    for (const row of rows) {
      await ingestInboundLead({
        organizationId: params.organizationId,
        channel: params.channel,
        externalId: row.externalId,
        name: row.name,
        phone: row.phone,
        email: row.email,
        city: row.city,
        requirement: row.requirement,
        sourceDetail: row.sourceDetail,
        rawPayload: (row.raw ?? row) as Prisma.InputJsonValue,
        createFmsJob: true,
      });
      imported += 1;
    }

    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "IDLE",
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });

    return { ok: true as const, imported };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "ERROR",
        lastSyncError: message,
      },
    });
    return { ok: false as const, reason: message };
  }
}

function extractLeadRows(
  payload: unknown,
  rowsPath: unknown,
): ExternalLeadRow[] {
  let node: unknown = payload;
  if (typeof rowsPath === "string" && rowsPath.trim()) {
    for (const part of rowsPath.split(".")) {
      if (!node || typeof node !== "object") {
        return [];
      }
      node = (node as Record<string, unknown>)[part];
    }
  }

  if (!Array.isArray(node)) {
    return [];
  }

  return node
    .map((item) => normalizeExternalRow(item))
    .filter((row): row is ExternalLeadRow => Boolean(row?.externalId));
}

function normalizeExternalRow(item: unknown): ExternalLeadRow | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const row = item as Record<string, unknown>;
  const externalId = String(
    row.externalId ?? row.id ?? row.lead_id ?? row.leadId ?? "",
  ).trim();

  if (!externalId) {
    return null;
  }

  return {
    externalId,
    name: pickString(row, ["name", "full_name", "lead_name"]),
    phone: pickString(row, ["phone", "mobile", "contact", "phone_number"]),
    email: pickString(row, ["email"]),
    city: pickString(row, ["city"]),
    requirement: pickString(row, ["requirement", "message", "notes", "comment"]),
    sourceDetail: pickString(row, ["campaign", "ad_name", "form_name", "source"]),
    raw: row,
  };
}

function pickString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export async function syncAllEnabledLeadConnections(organizationId: string) {
  const connections = await prisma.leadIngestConnection.findMany({
    where: { organizationId, enabled: true, channel: { not: "WHATSAPP" } },
  });

  const results = [];
  for (const connection of connections) {
    const result = await pullLeadsFromConnection({
      organizationId,
      channel: connection.channel,
    });
    results.push({ channel: connection.channel, ...result });
  }

  return results;
}
