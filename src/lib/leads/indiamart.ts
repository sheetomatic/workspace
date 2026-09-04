import { prisma } from "@/lib/db";
import { parseDatetimeLocalAsIst } from "@/lib/leads/ist-datetime";
import {
  asConfigRecord,
  hashLeadWebhookSecret,
  parseIndiaMartLeadConfig,
  parseIndiaMartPullConfig,
  readString,
} from "@/lib/leads/connection-config";
import { ingestInboundLead } from "@/lib/leads/ingest";
import type { LeadPullResult, LeadSyncCounts } from "@/lib/leads/sync-messages";

export const INDIAMART_PULL_URL =
  "https://mapi.indiamart.com/wservce/crm/crmListing/v2/";

/** IndiaMART returns 429 if called more than once per 5 minutes. */
export const INDIAMART_MIN_PULL_INTERVAL_MS = 5 * 60 * 1000 + 5_000;

const QUERY_TYPE_LABELS: Record<string, string> = {
  W: "Direct enquiry",
  B: "Buy-Lead",
  P: "PNS call",
  BIZ: "Catalog view",
  WA: "WhatsApp enquiry",
};

export type IndiaMartMappedLead = {
  externalId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  company: string | null;
  address: string | null;
  zipCode: string | null;
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

function parseQueryTime(value: string | null): Date | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  return parseDatetimeLocalAsIst(normalized);
}

export function mapIndiaMartLeadRecord(
  item: unknown,
): IndiaMartMappedLead | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return null;
  }
  const row = item as Record<string, unknown>;
  const externalId = pickRecordString(row, [
    "UNIQUE_QUERY_ID",
    "unique_query_id",
    "QUERY_ID",
  ]);
  if (!externalId) {
    return null;
  }

  const product = pickRecordString(row, [
    "QUERY_PRODUCT_NAME",
    "query_product_name",
  ]);
  const message = pickRecordString(row, ["QUERY_MESSAGE", "query_message"]);
  const subject = pickRecordString(row, ["SUBJECT", "subject"]);
  const requirement = [product, message || subject].filter(Boolean).join(" — ") ||
    null;
  const queryType = pickRecordString(row, ["QUERY_TYPE", "query_type"]) ?? "";
  const typeLabel = QUERY_TYPE_LABELS[queryType] ?? (queryType || "Enquiry");

  return {
    externalId,
    name: pickRecordString(row, ["SENDER_NAME", "sender_name"]),
    phone: pickRecordString(row, [
      "SENDER_MOBILE",
      "SENDER_MOBILE_ALT",
      "SENDER_PHONE",
      "SENDER_PHONE_ALT",
    ]),
    email: pickRecordString(row, ["SENDER_EMAIL", "SENDER_EMAIL_ALT"]),
    city: pickRecordString(row, ["SENDER_CITY", "sender_city"]),
    company: pickRecordString(row, ["SENDER_COMPANY", "sender_company"]),
    address: pickRecordString(row, ["SENDER_ADDRESS", "sender_address"]),
    zipCode: pickRecordString(row, ["SENDER_PINCODE", "sender_pincode"]),
    requirement,
    sourceDetail: product ? `IndiaMART ${typeLabel}: ${product}` : `IndiaMART ${typeLabel}`,
    campaign: pickRecordString(row, ["QUERY_MCAT_NAME", "query_mcat_name"]),
    capturedAt: parseQueryTime(
      pickRecordString(row, ["QUERY_TIME", "query_time"]),
    ),
    raw: row,
  };
}

function responseNode(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  const root = payload as Record<string, unknown>;
  if (root.body && typeof root.body === "object") {
    return responseNode(root.body);
  }
  if ("RESPONSE" in root) {
    return root.RESPONSE;
  }
  if ("response" in root) {
    return root.response;
  }
  return payload;
}

export function extractIndiaMartLeadRecords(payload: unknown): IndiaMartMappedLead[] {
  const node = responseNode(payload);
  const items = Array.isArray(node)
    ? node
    : node && typeof node === "object"
      ? [node]
      : [];
  return items
    .map((item) => mapIndiaMartLeadRecord(item))
    .filter((row): row is IndiaMartMappedLead => Boolean(row));
}

export function indiaMartPullStatus(payload: unknown): {
  code: number | null;
  message: string | null;
  empty: boolean;
} {
  if (!payload || typeof payload !== "object") {
    return { code: null, message: null, empty: false };
  }
  const root = payload as Record<string, unknown>;
  const rawCode = root.CODE ?? root.code;
  const code =
    typeof rawCode === "number"
      ? rawCode
      : typeof rawCode === "string" && rawCode.trim()
        ? Number.parseInt(rawCode, 10)
        : null;
  const message =
    typeof root.MESSAGE === "string"
      ? root.MESSAGE
      : typeof root.message === "string"
        ? root.message
        : null;
  return {
    code: Number.isFinite(code) ? code : null,
    message,
    empty: code === 204,
  };
}

export async function findIndiaMartConnectionByWebhookSecret(secret: string) {
  const trimmed = secret.trim();
  if (!trimmed) return null;
  const hash = hashLeadWebhookSecret(trimmed);

  const byHash = await prisma.leadIngestConnection.findFirst({
    where: {
      channel: "INDIAMART",
      enabled: true,
      ingestSecretHash: hash,
    },
  });
  if (byHash) {
    return byHash;
  }

  const rows = await prisma.leadIngestConnection.findMany({
    where: { channel: "INDIAMART", enabled: true, ingestSecretHash: null },
  });
  return (
    rows.find((row) => {
      const config = parseIndiaMartLeadConfig(row.config);
      return config?.webhookSecret === trimmed;
    }) ?? null
  );
}

async function ingestMappedLeads(params: {
  organizationId: string;
  connectionId: string;
  leads: IndiaMartMappedLead[];
  suppressOwnerNotify: boolean;
}): Promise<LeadSyncCounts> {
  const counts: LeadSyncCounts = { processed: 0, created: 0, updated: 0, skipped: 0 };
  for (const lead of params.leads) {
    const result = await ingestInboundLead({
      organizationId: params.organizationId,
      channel: "INDIAMART",
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
      zipCode: lead.zipCode,
      requirement: lead.requirement,
      sourceDetail: lead.sourceDetail,
      campaign: lead.campaign,
      capturedAt: lead.capturedAt,
      utmSource: "indiamart",
      utmMedium: "lead_api",
      utmCampaign: lead.campaign,
      rawPayload: lead.raw as object,
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

export async function processIndiaMartLeadPush(params: {
  webhookSecret: string;
  payload: unknown;
}) {
  const connection = await findIndiaMartConnectionByWebhookSecret(
    params.webhookSecret,
  );
  if (!connection) {
    return { ok: false as const, reason: "unknown_webhook" as const };
  }

  const leads = extractIndiaMartLeadRecords(params.payload);
  if (!leads.length) {
    return { ok: true as const, ignored: true as const, leadId: null };
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
          ? "IndiaMART lead had no usable phone"
          : null,
      syncStatus: counts.processed > 0 ? "IDLE" : "ERROR",
    },
  });

  return {
    ok: true as const,
    created: counts.created,
    processed: counts.processed,
    leadId: null,
  };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatIndiaMartTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const day = get("day").padStart(2, "0");
  const monthRaw = get("month").replace(".", "");
  const month =
    MONTHS.find((item) => item.toLowerCase() === monthRaw.toLowerCase()) ??
    monthRaw.slice(0, 3);
  const year = get("year");
  let hour = get("hour");
  if (hour === "24") hour = "00";
  const minute = get("minute").padStart(2, "0");
  const second = get("second").padStart(2, "0");
  return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
}

function lastPullAt(config: unknown): Date | null {
  const raw = readString(asConfigRecord(config), "lastPullAt");
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function pullIndiaMartLeads(params: {
  organizationId: string;
  forceFull?: boolean;
  interactive?: boolean;
  allowDisabled?: boolean;
}): Promise<LeadPullResult> {
  const connection = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId: params.organizationId,
        channel: "INDIAMART",
      },
    },
  });

  if (!connection || (!connection.enabled && !params.allowDisabled)) {
    return { ok: false, reason: "connection_disabled" };
  }

  const pull = parseIndiaMartPullConfig(connection.config);
  if (!pull) {
    return { ok: false, reason: "missing_credentials" };
  }

  const previousPull = lastPullAt(connection.config);
  if (
    previousPull &&
    Date.now() - previousPull.getTime() < INDIAMART_MIN_PULL_INTERVAL_MS
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

  const url = new URL(INDIAMART_PULL_URL);
  url.searchParams.set("glusr_crm_key", pull.glusrCrmKey);
  if (params.forceFull) {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    url.searchParams.set("start_time", formatIndiaMartTimestamp(start));
    url.searchParams.set("end_time", formatIndiaMartTimestamp(end));
  }

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
    const payload = (await response.json()) as unknown;
    const status = indiaMartPullStatus(payload);

    if (status.code === 429) {
      throw Object.assign(new Error(status.message || "IndiaMART rate limit"), {
        reason: "rate_limited" as const,
      });
    }

    if (status.empty) {
      const merged = {
        ...asConfigRecord(connection.config),
        lastPullAt: new Date().toISOString(),
      };
      await prisma.leadIngestConnection.update({
        where: { id: connection.id },
        data: {
          syncStatus: "IDLE",
          lastSyncAt: new Date(),
          lastSyncError: null,
          config: merged as object,
        },
      });
      return {
        ok: true,
        imported: 0,
        counts: { processed: 0, created: 0, updated: 0 },
      };
    }

    if (!response.ok || (status.code && status.code >= 400)) {
      throw new Error(
        status.message || `IndiaMART API ${response.status || status.code}`,
      );
    }

    const leads = extractIndiaMartLeadRecords(payload);
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
            ? "IndiaMART rows skipped (need a phone)"
            : null,
        config: merged as object,
      },
    });

    return { ok: true, imported: counts.processed, counts };
  } catch (error) {
    const reason =
      error &&
      typeof error === "object" &&
      "reason" in error &&
      (error as { reason?: string }).reason === "rate_limited"
        ? "rate_limited"
        : error instanceof Error
          ? error.message
          : "IndiaMART pull failed";
    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "ERROR",
        lastSyncError:
          reason === "rate_limited"
            ? "IndiaMART allows one pull every 5 minutes. Try again shortly."
            : reason,
      },
    });
    return { ok: false, reason };
  }
}
