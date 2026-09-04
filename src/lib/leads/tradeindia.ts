import { prisma } from "@/lib/db";
import { parseDatetimeLocalAsIst } from "@/lib/leads/ist-datetime";
import {
  asConfigRecord,
  hashLeadWebhookSecret,
  parseTradeIndiaLeadConfig,
  parseTradeIndiaPullConfig,
  readString,
} from "@/lib/leads/connection-config";
import { ingestInboundLead } from "@/lib/leads/ingest";
import type { LeadPullResult, LeadSyncCounts } from "@/lib/leads/sync-messages";

export const TRADEINDIA_PULL_URL =
  "https://www.tradeindia.com/utils/my_inquiry.html";

export const TRADEINDIA_MIN_PULL_INTERVAL_MS = 10 * 60 * 1000;

export type TradeIndiaMappedLead = {
  externalId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  company: string | null;
  address: string | null;
  requirement: string | null;
  sourceDetail: string | null;
  campaign: string | null;
  capturedAt: Date | null;
  raw: Record<string, unknown>;
};

function pickRecordString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function parseInquiryTime(value: string | null): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseDatetimeLocalAsIst(`${value}T00:00`);
  }
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  return parseDatetimeLocalAsIst(normalized);
}

export function mapTradeIndiaLeadRecord(
  item: unknown,
): TradeIndiaMappedLead | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return null;
  }
  const row = item as Record<string, unknown>;
  const externalId = pickRecordString(row, [
    "rfi_id",
    "rfiId",
    "inquiry_id",
    "enquiry_id",
    "id",
  ]);
  if (!externalId) {
    return null;
  }

  const product = pickRecordString(row, [
    "product_name",
    "productName",
    "subject",
  ]);
  const message = pickRecordString(row, ["message", "inquiry_message", "remarks"]);
  const requirement = [product, message].filter(Boolean).join(" — ") || null;

  return {
    externalId,
    name: pickRecordString(row, ["sender_name", "senderName", "name"]),
    phone: pickRecordString(row, [
      "sender_mobile",
      "senderMobile",
      "mobile",
      "sender_phone",
      "phone",
    ]),
    email: pickRecordString(row, ["sender_email", "senderEmail", "email"]),
    city: pickRecordString(row, ["sender_city", "senderCity", "city"]),
    company: pickRecordString(row, [
      "sender_co",
      "sender_company",
      "senderCompany",
      "company",
    ]),
    address: pickRecordString(row, [
      "sender_address",
      "senderAddress",
      "address",
    ]),
    requirement,
    sourceDetail: product ? `TradeIndia: ${product}` : "TradeIndia inquiry",
    campaign: product,
    capturedAt: parseInquiryTime(
      pickRecordString(row, [
        "date",
        "inquiry_date",
        "generated_date",
        "created_at",
      ]),
    ),
    raw: row,
  };
}

export function extractTradeIndiaLeadRecords(
  payload: unknown,
): TradeIndiaMappedLead[] {
  let node: unknown = payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const root = payload as Record<string, unknown>;
    if (root.body && typeof root.body === "object") {
      return extractTradeIndiaLeadRecords(root.body);
    }
    const nested =
      root.inquiries ??
      root.data ??
      root.RESPONSE ??
      root.response ??
      root.result ??
      root.leads;
    if (nested !== undefined) {
      node = nested;
    }
  }

  const items = Array.isArray(node)
    ? node
    : node && typeof node === "object"
      ? [node]
      : [];

  return items
    .map((item) => mapTradeIndiaLeadRecord(item))
    .filter((row): row is TradeIndiaMappedLead => Boolean(row));
}

export function formatTradeIndiaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function findTradeIndiaConnectionByWebhookSecret(secret: string) {
  const trimmed = secret.trim();
  if (!trimmed) return null;
  const hash = hashLeadWebhookSecret(trimmed);

  const byHash = await prisma.leadIngestConnection.findFirst({
    where: {
      channel: "TRADEINDIA",
      enabled: true,
      ingestSecretHash: hash,
    },
  });
  if (byHash) {
    return byHash;
  }

  const rows = await prisma.leadIngestConnection.findMany({
    where: { channel: "TRADEINDIA", enabled: true, ingestSecretHash: null },
  });
  return (
    rows.find((row) => {
      const config = parseTradeIndiaLeadConfig(row.config);
      return config?.webhookSecret === trimmed;
    }) ?? null
  );
}

async function ingestMappedLeads(params: {
  organizationId: string;
  connectionId: string;
  leads: TradeIndiaMappedLead[];
  suppressOwnerNotify: boolean;
}): Promise<LeadSyncCounts> {
  const counts: LeadSyncCounts = { processed: 0, created: 0, updated: 0, skipped: 0 };
  for (const lead of params.leads) {
    const result = await ingestInboundLead({
      organizationId: params.organizationId,
      channel: "TRADEINDIA",
      connectionId: params.connectionId,
      skipConnectionSetup: true,
      suppressOwnerNotify: params.suppressOwnerNotify,
      externalId: lead.externalId,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      company: lead.company,
      address: lead.address,
      requirement: lead.requirement,
      sourceDetail: lead.sourceDetail,
      campaign: lead.campaign,
      capturedAt: lead.capturedAt,
      utmSource: "tradeindia",
      utmMedium: "inquiry_api",
      utmCampaign: lead.campaign,
      rawPayload: lead.raw,
    });
    if (result.skipped || !result.lead) {
      counts.skipped = (counts.skipped ?? 0) + 1;
      continue;
    }
    counts.processed += 1;
    if (result.created) {
      counts.created += 1;
    } else {
      counts.updated += 1;
    }
  }
  return counts;
}

export async function processTradeIndiaLeadPush(params: {
  webhookSecret: string;
  payload: unknown;
}) {
  const connection = await findTradeIndiaConnectionByWebhookSecret(
    params.webhookSecret,
  );
  if (!connection) {
    return { ok: false as const, reason: "unknown_webhook" as const };
  }

  const leads = extractTradeIndiaLeadRecords(params.payload);
  if (!leads.length) {
    return { ok: true as const, ignored: true as const };
  }

  const counts = await ingestMappedLeads({
    organizationId: connection.organizationId,
    connectionId: connection.id,
    leads,
    suppressOwnerNotify: false,
  });

  await prisma.leadIngestConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncError:
        counts.processed === 0 && (counts.skipped ?? 0) > 0
          ? "TradeIndia lead had no usable phone"
          : null,
      syncStatus: counts.processed > 0 ? "IDLE" : "ERROR",
    },
  });

  return { ok: true as const, created: counts.created, processed: counts.processed };
}

function lastPullAt(config: unknown): Date | null {
  const raw = readString(asConfigRecord(config), "lastPullAt");
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function pullTradeIndiaLeads(params: {
  organizationId: string;
  forceFull?: boolean;
  interactive?: boolean;
  allowDisabled?: boolean;
}): Promise<LeadPullResult> {
  const connection = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId: params.organizationId,
        channel: "TRADEINDIA",
      },
    },
  });

  if (!connection || (!connection.enabled && !params.allowDisabled)) {
    return { ok: false, reason: "connection_disabled" };
  }

  const pull = parseTradeIndiaPullConfig(connection.config);
  if (!pull) {
    return { ok: false, reason: "missing_credentials" };
  }

  const previousPull = lastPullAt(connection.config);
  if (
    previousPull &&
    Date.now() - previousPull.getTime() < TRADEINDIA_MIN_PULL_INTERVAL_MS
  ) {
    if (params.interactive) {
      return { ok: false, reason: "rate_limited" };
    }
    return {
      ok: true,
      imported: 0,
      counts: { processed: 0, created: 0, updated: 0 },
    };
  }

  const end = new Date();
  const windowDays = params.forceFull ? 7 : 2;
  const start = new Date(end.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const url = new URL(TRADEINDIA_PULL_URL);
  url.searchParams.set("userid", pull.userId);
  url.searchParams.set("profile_id", pull.profileId);
  url.searchParams.set("key", pull.apiKey);
  url.searchParams.set("from_date", formatTradeIndiaDate(start));
  url.searchParams.set("to_date", formatTradeIndiaDate(end));

  await prisma.leadIngestConnection.update({
    where: { id: connection.id },
    data: { syncStatus: "SYNCING", lastSyncError: null },
  });

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await response.text();
    let payload: unknown = text;
    try {
      payload = text ? (JSON.parse(text) as unknown) : [];
    } catch {
      throw new Error("TradeIndia did not return JSON. Check userid, profile id, and key.");
    }

    if (!response.ok) {
      throw new Error(`TradeIndia API ${response.status}`);
    }

    const leads = extractTradeIndiaLeadRecords(payload);
    const counts = await ingestMappedLeads({
      organizationId: params.organizationId,
      connectionId: connection.id,
      leads,
      suppressOwnerNotify: true,
    });

    const merged = {
      ...asConfigRecord(connection.config),
      lastPullAt: new Date().toISOString(),
    };
    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "IDLE",
        lastSyncAt: new Date(),
        lastSyncError:
          counts.processed === 0 && (counts.skipped ?? 0) > 0
            ? "TradeIndia rows skipped (need a phone)"
            : null,
        config: merged as object,
      },
    });

    return { ok: true, imported: counts.processed, counts };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "TradeIndia pull failed";
    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: { syncStatus: "ERROR", lastSyncError: message },
    });
    return { ok: false, reason: message };
  }
}
