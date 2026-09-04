import { prisma } from "@/lib/db";
import { parseDatetimeLocalAsIst } from "@/lib/leads/ist-datetime";
import { ingestInboundLead } from "@/lib/leads/ingest";
import { findLeadConnectionByWebhookSecret } from "@/lib/leads/webhook-secret";

export type JustdialMappedLead = {
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

function pick(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const direct = row[key];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    if (typeof direct === "number" && Number.isFinite(direct)) return String(direct);
    const lower = Object.keys(row).find((item) => item.toLowerCase() === key.toLowerCase());
    if (lower) {
      const value = row[lower];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
  }
  return null;
}

function parseWhen(value: string | null): Date | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  return parseDatetimeLocalAsIst(normalized);
}

export function mapJustdialLeadRecord(item: unknown): JustdialMappedLead | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return null;
  }
  const row = item as Record<string, unknown>;
  const phone = pick(row, ["mobile", "phone", "dncmobile", "dncphone"]);
  const leadId = pick(row, ["leadid", "lead_id", "parentid", "id"]);
  const externalId = leadId || phone;
  if (!externalId) {
    return null;
  }
  const category = pick(row, ["category", "prefix", "leadtype"]);
  const area = pick(row, ["area", "brancharea"]);
  const city = pick(row, ["city"]);
  return {
    externalId,
    name: pick(row, ["name"]),
    phone,
    email: pick(row, ["email"]),
    city,
    company: pick(row, ["company"]),
    address: [area, city].filter(Boolean).join(", ") || null,
    zipCode: pick(row, ["pincode", "branchpin"]),
    requirement: [category, pick(row, ["prefix"])].filter(Boolean).join(" — ") ||
      "Justdial enquiry",
    sourceDetail: category ? `Justdial: ${category}` : "Justdial enquiry",
    campaign: category,
    capturedAt: parseWhen(pick(row, ["date", "time"])),
    raw: row,
  };
}

export function extractJustdialLeadRecords(payload: unknown): JustdialMappedLead[] {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const root = payload as Record<string, unknown>;
    const nested = root.data ?? root.leads ?? root.RESPONSE ?? root.response;
    if (nested !== undefined) {
      return extractJustdialLeadRecords(nested);
    }
  }
  const items = Array.isArray(payload) ? payload : payload ? [payload] : [];
  return items
    .map((item) => mapJustdialLeadRecord(item))
    .filter((row): row is JustdialMappedLead => Boolean(row));
}

export async function processJustdialLeadPush(params: {
  webhookSecret: string;
  payload: unknown;
}) {
  const connection = await findLeadConnectionByWebhookSecret({
    channel: "JUSTDIAL",
    secret: params.webhookSecret,
  });
  if (!connection) {
    return { ok: false as const, reason: "unknown_webhook" as const };
  }
  const leads = extractJustdialLeadRecords(params.payload);
  if (!leads.length) {
    return { ok: true as const, ignored: true as const };
  }

  let processed = 0;
  let created = 0;
  for (const lead of leads) {
    const result = await ingestInboundLead({
      organizationId: connection.organizationId,
      channel: "JUSTDIAL",
      connectionId: connection.id,
      skipConnectionSetup: true,
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
      utmSource: "justdial",
      utmMedium: "enquiry",
      utmCampaign: lead.campaign,
      rawPayload: lead.raw as object,
    });
    if (result.lead) {
      processed += 1;
      if (result.created) created += 1;
    }
  }

  await prisma.leadIngestConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncError: processed > 0 ? null : "Justdial payload had no usable phone",
      syncStatus: processed > 0 ? "IDLE" : "ERROR",
    },
  });

  return { ok: true as const, processed, created };
}
