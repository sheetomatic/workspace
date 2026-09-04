import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import {
  asConfigRecord,
  parseWooCommercePullConfig,
} from "@/lib/leads/connection-config";
import { ingestInboundLead } from "@/lib/leads/ingest";
import type { LeadPullResult, LeadSyncCounts } from "@/lib/leads/sync-messages";
import { findLeadConnectionByWebhookSecret } from "@/lib/leads/webhook-secret";

type WooAddress = {
  first_name?: string;
  last_name?: string;
  company?: string;
  city?: string;
  postcode?: string;
  address_1?: string;
  phone?: string;
  email?: string;
};

type WooLineItem = { name?: string; quantity?: number };

export type WooOrder = {
  id?: number | string;
  number?: string;
  status?: string;
  date_created?: string;
  total?: string;
  billing?: WooAddress;
  shipping?: WooAddress;
  line_items?: WooLineItem[];
};

export type WooMappedLead = {
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
  capturedAt: Date | null;
  pipeValue: number | null;
  raw: Record<string, unknown>;
};

function joinName(first?: string | null, last?: string | null) {
  return [first, last].filter((part) => part?.trim()).join(" ").trim() || null;
}

export function mapWooCommerceOrder(order: WooOrder): WooMappedLead | null {
  const id = order.id != null ? String(order.id) : "";
  if (!id) return null;
  const billing = order.billing ?? {};
  const shipping = order.shipping ?? {};
  const number = order.number?.trim() || id;
  const lines = (order.line_items ?? [])
    .map((item) => item.name?.trim())
    .filter(Boolean)
    .slice(0, 6);
  const total = Number.parseFloat(String(order.total ?? ""));
  return {
    externalId: `order:${id}`,
    name: joinName(billing.first_name, billing.last_name),
    phone: billing.phone?.trim() || null,
    email: billing.email?.trim() || null,
    city: billing.city?.trim() || shipping.city?.trim() || null,
    company: billing.company?.trim() || null,
    address: billing.address_1?.trim() || shipping.address_1?.trim() || null,
    zipCode: billing.postcode?.trim() || shipping.postcode?.trim() || null,
    requirement: lines.length
      ? `WooCommerce #${number}: ${lines.join(", ")}`
      : `WooCommerce order #${number}`,
    sourceDetail: `WooCommerce #${number}`,
    capturedAt: order.date_created ? new Date(order.date_created) : null,
    pipeValue: Number.isFinite(total) ? total : null,
    raw: order as Record<string, unknown>,
  };
}

export function verifyWooCommerceSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
) {
  const key = secret?.trim();
  if (!key) return true;
  if (!signatureHeader?.trim()) return false;
  const expected = createHmac("sha256", key).update(rawBody, "utf8").digest("base64");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader.trim()));
  } catch {
    return false;
  }
}

function wooAuthHeader(consumerKey: string, consumerSecret: string) {
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
}

async function ingestMapped(params: {
  organizationId: string;
  connectionId: string;
  lead: WooMappedLead;
  suppressOwnerNotify: boolean;
}) {
  return ingestInboundLead({
    organizationId: params.organizationId,
    channel: "WOOCOMMERCE",
    connectionId: params.connectionId,
    skipConnectionSetup: true,
    suppressOwnerNotify: params.suppressOwnerNotify,
    externalId: params.lead.externalId,
    name: params.lead.name,
    phone: params.lead.phone,
    email: params.lead.email,
    city: params.lead.city,
    company: params.lead.company,
    address: params.lead.address,
    zipCode: params.lead.zipCode,
    requirement: params.lead.requirement,
    sourceDetail: params.lead.sourceDetail,
    capturedAt: params.lead.capturedAt,
    pipeValue: params.lead.pipeValue,
    utmSource: "woocommerce",
    utmMedium: "store",
    rawPayload: params.lead.raw,
  });
}

export async function processWooCommerceLeadWebhook(params: {
  webhookSecret: string;
  payload: unknown;
  signatureHeader: string | null;
  rawBody: string;
}) {
  const connection = await findLeadConnectionByWebhookSecret({
    channel: "WOOCOMMERCE",
    secret: params.webhookSecret,
  });
  if (!connection) {
    return { ok: false as const, reason: "unknown_webhook" as const };
  }
  const storedSecret = String(
    (asConfigRecord(connection.config).webhookSecret as string | undefined) ?? "",
  );
  if (
    !verifyWooCommerceSignature(params.rawBody, params.signatureHeader, storedSecret)
  ) {
    return { ok: false as const, reason: "bad_signature" as const };
  }
  const mapped = mapWooCommerceOrder(params.payload as WooOrder);
  if (!mapped) {
    return { ok: true as const, ignored: true as const };
  }
  const result = await ingestMapped({
    organizationId: connection.organizationId,
    connectionId: connection.id,
    lead: mapped,
    suppressOwnerNotify: false,
  });
  await prisma.leadIngestConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncError: result.lead ? null : "WooCommerce webhook had no usable phone",
      syncStatus: result.lead ? "IDLE" : "ERROR",
    },
  });
  return { ok: true as const, created: result.created, leadId: result.lead?.id ?? null };
}

async function wooFetch(params: {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  path: string;
  method?: string;
  body?: unknown;
}) {
  const url = `${params.storeUrl}${params.path}`;
  const response = await fetch(url, {
    method: params.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: wooAuthHeader(params.consumerKey, params.consumerSecret),
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
    cache: "no-store",
  });
  const json = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    const message =
      json &&
      typeof json === "object" &&
      "message" in json &&
      typeof (json as { message?: unknown }).message === "string"
        ? (json as { message: string }).message
        : `WooCommerce API ${response.status}`;
    throw new Error(message);
  }
  return json;
}

export async function verifyWooCommerceCredentials(params: {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}) {
  try {
    await wooFetch({
      ...params,
      path: "/wp-json/wc/v3/orders?per_page=1",
    });
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof Error ? error.message : "WooCommerce key check failed",
    };
  }
}

export async function registerWooCommerceLeadWebhooks(params: {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  webhookUrl: string;
  webhookSecret: string;
}) {
  try {
    const existing = (await wooFetch({
      ...params,
      path: "/wp-json/wc/v3/webhooks?per_page=100",
    })) as Array<{ topic?: string; delivery_url?: string }>;
    const already = Array.isArray(existing)
      ? existing.some(
          (row) =>
            row.topic === "order.created" && row.delivery_url === params.webhookUrl,
        )
      : false;
    if (already) {
      return { ok: true as const };
    }
    await wooFetch({
      ...params,
      method: "POST",
      path: "/wp-json/wc/v3/webhooks",
      body: {
        name: "Sheetomatic CRM orders",
        topic: "order.created",
        delivery_url: params.webhookUrl,
        secret: params.webhookSecret,
        status: "active",
      },
    });
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof Error
          ? error.message
          : "Could not register WooCommerce webhook",
    };
  }
}

export async function pullWooCommerceLeads(params: {
  organizationId: string;
  forceFull?: boolean;
  allowDisabled?: boolean;
}): Promise<LeadPullResult> {
  const connection = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId: params.organizationId,
        channel: "WOOCOMMERCE",
      },
    },
  });
  if (!connection || (!connection.enabled && !params.allowDisabled)) {
    return { ok: false, reason: "connection_disabled" };
  }
  const pull = parseWooCommercePullConfig(connection.config);
  if (!pull) {
    return { ok: false, reason: "missing_credentials" };
  }

  await prisma.leadIngestConnection.update({
    where: { id: connection.id },
    data: { syncStatus: "SYNCING", lastSyncError: null },
  });

  try {
    const perPage = params.forceFull ? 50 : 20;
    const json = (await wooFetch({
      ...pull,
      path: `/wp-json/wc/v3/orders?per_page=${perPage}&orderby=date&order=desc`,
    })) as WooOrder[];
    const orders = Array.isArray(json) ? json : [];
    const counts: LeadSyncCounts = { processed: 0, created: 0, updated: 0, skipped: 0 };
    for (const order of orders) {
      const mapped = mapWooCommerceOrder(order);
      if (!mapped) continue;
      const result = await ingestMapped({
        organizationId: params.organizationId,
        connectionId: connection.id,
        lead: mapped,
        suppressOwnerNotify: true,
      });
      if (result.skipped || !result.lead) {
        counts.skipped = (counts.skipped ?? 0) + 1;
        continue;
      }
      counts.processed += 1;
      if (result.created) counts.created += 1;
      else counts.updated += 1;
    }
    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: {
        syncStatus: "IDLE",
        lastSyncAt: new Date(),
        lastSyncError: null,
        config: {
          ...asConfigRecord(connection.config),
          lastPullAt: new Date().toISOString(),
        } as object,
      },
    });
    return { ok: true, imported: counts.processed, counts };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "WooCommerce pull failed";
    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: { syncStatus: "ERROR", lastSyncError: message },
    });
    return { ok: false, reason: message };
  }
}
