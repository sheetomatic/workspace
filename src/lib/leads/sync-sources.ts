import type { InboundLeadStatus, LeadCallingStatus, LeadSourceChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ingestInboundLead } from "@/lib/leads/ingest";
import { pullLeadsFromGoogleSheet } from "@/lib/leads/google-sheets";
import { resolveGoogleSheetsLeadConfig } from "@/lib/leads/sheet-config";
import type { LeadSyncCounts } from "@/lib/leads/sync-messages";

export type ExternalLeadRow = {
  externalId: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  company?: string | null;
  address?: string | null;
  zipCode?: string | null;
  requirement?: string | null;
  sourceDetail?: string | null;
  meetingNotes?: string | null;
  callingStatus?: LeadCallingStatus;
  capturedAt?: Date | null;
  nextFollowUpAt?: Date | null;
  status?: InboundLeadStatus;
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

  if (params.channel === "GOOGLE_SHEETS") {
    return pullGoogleSheetsLeads(params.organizationId, connection);
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

    let counts: LeadSyncCounts = { processed: 0, created: 0, updated: 0 };
    for (const row of rows) {
      const result = await ingestInboundLead({
        organizationId: params.organizationId,
        channel: params.channel,
        externalId: row.externalId,
        name: row.name,
        phone: row.phone,
        email: row.email,
        city: row.city,
        company: row.company,
        address: row.address,
        zipCode: row.zipCode,
        requirement: row.requirement,
        sourceDetail: row.sourceDetail,
        meetingNotes: row.meetingNotes,
        callingStatus: row.callingStatus,
        capturedAt: row.capturedAt ?? undefined,
        nextFollowUpAt: row.nextFollowUpAt ?? undefined,
        status: row.status,
        rawPayload: (row.raw ?? row) as Prisma.InputJsonValue,
        createFmsJob: true,
      });
      counts.processed += 1;
      if (result.created) {
        counts.created += 1;
      } else {
        counts.updated += 1;
      }
    }

    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "IDLE",
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });

    return { ok: true as const, imported: counts.processed, counts };
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

async function pullGoogleSheetsLeads(
  organizationId: string,
  connection: { id: string; config: unknown },
) {
  const sheetConfig = resolveGoogleSheetsLeadConfig(connection.config);
  if (!sheetConfig) {
    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "ERROR",
        lastSyncError: "Add a spreadsheet ID or URL in Google Sheets settings.",
      },
    });
    return { ok: false as const, reason: "missing_spreadsheet" };
  }

  await prisma.leadIngestConnection.update({
    where: { id: connection.id },
    data: { syncStatus: "SYNCING", lastSyncError: null },
  });

  try {
    const rows = await pullLeadsFromGoogleSheet(sheetConfig);
    let counts: LeadSyncCounts = { processed: 0, created: 0, updated: 0 };
    for (const row of rows) {
      const result = await ingestInboundLead({
        organizationId,
        channel: "GOOGLE_SHEETS",
        externalId: row.externalId,
        name: row.name,
        phone: row.phone,
        email: row.email,
        city: row.city,
        company: row.company,
        address: row.address,
        zipCode: row.zipCode,
        requirement: row.requirement,
        sourceDetail: row.sourceDetail,
        meetingNotes: row.meetingNotes,
        callingStatus: row.callingStatus,
        capturedAt: row.capturedAt ?? undefined,
        nextFollowUpAt: row.nextFollowUpAt ?? undefined,
        status: row.status,
        rawPayload: row.raw as Prisma.InputJsonValue,
        createFmsJob: true,
      });
      counts.processed += 1;
      if (result.created) {
        counts.created += 1;
      } else {
        counts.updated += 1;
      }
    }

    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "IDLE",
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });

    return { ok: true as const, imported: counts.processed, counts };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Sheets sync failed";
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

function pickString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
