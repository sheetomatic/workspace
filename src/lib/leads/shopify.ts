import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import {
  asConfigRecord,
  parseShopifyPullConfig,
  shopifyApiVersion,
  shopifyLeadWebhookUrl,
} from "@/lib/leads/connection-config";
import { ingestInboundLead } from "@/lib/leads/ingest";
import type { LeadPullResult, LeadSyncCounts } from "@/lib/leads/sync-messages";
import { findLeadConnectionByWebhookSecret } from "@/lib/leads/webhook-secret";

type ShopifyAddress = {
  first_name?: string;
  last_name?: string;
  company?: string;
  city?: string;
  zip?: string;
  address1?: string;
  phone?: string;
};

type ShopifyCustomer = {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  default_address?: ShopifyAddress;
};

type ShopifyLineItem = { title?: string; quantity?: number };

type ShopifyOrder = {
  id?: number | string;
  name?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  total_price?: string;
  customer?: ShopifyCustomer;
  billing_address?: ShopifyAddress;
  shipping_address?: ShopifyAddress;
  line_items?: ShopifyLineItem[];
};

export type ShopifyMappedLead = {
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function mapShopifyOrder(order: ShopifyOrder): ShopifyMappedLead | null {
  const id = order.id != null ? String(order.id) : "";
  if (!id) return null;
  const billing = order.billing_address;
  const shipping = order.shipping_address;
  const customer = order.customer;
  const name =
    joinName(customer?.first_name, customer?.last_name) ||
    joinName(billing?.first_name, billing?.last_name) ||
    joinName(shipping?.first_name, shipping?.last_name);
  const lines = (order.line_items ?? [])
    .map((item) => item.title?.trim())
    .filter(Boolean)
    .slice(0, 6);
  const orderName = order.name?.trim() || `#${id}`;
  const total = Number.parseFloat(String(order.total_price ?? ""));
  return {
    externalId: `order:${id}`,
    name,
    phone:
      order.phone?.trim() ||
      customer?.phone?.trim() ||
      billing?.phone?.trim() ||
      shipping?.phone?.trim() ||
      null,
    email: order.email?.trim() || customer?.email?.trim() || null,
    city: billing?.city?.trim() || shipping?.city?.trim() || null,
    company: billing?.company?.trim() || shipping?.company?.trim() || null,
    address: billing?.address1?.trim() || shipping?.address1?.trim() || null,
    zipCode: billing?.zip?.trim() || shipping?.zip?.trim() || null,
    requirement: lines.length
      ? `Shopify ${orderName}: ${lines.join(", ")}`
      : `Shopify order ${orderName}`,
    sourceDetail: `Shopify ${orderName}`,
    capturedAt: order.created_at ? new Date(order.created_at) : null,
    pipeValue: Number.isFinite(total) ? total : null,
    raw: order as Record<string, unknown>,
  };
}

export function mapShopifyCustomer(customer: ShopifyCustomer): ShopifyMappedLead | null {
  const id = customer.id != null ? String(customer.id) : "";
  if (!id) return null;
  const address = customer.default_address;
  return {
    externalId: `customer:${id}`,
    name: joinName(customer.first_name, customer.last_name),
    phone: customer.phone?.trim() || address?.phone?.trim() || null,
    email: customer.email?.trim() || null,
    city: address?.city?.trim() || null,
    company: address?.company?.trim() || null,
    address: address?.address1?.trim() || null,
    zipCode: address?.zip?.trim() || null,
    requirement: "Shopify customer",
    sourceDetail: "Shopify customer",
    capturedAt: customer.created_at ? new Date(customer.created_at) : null,
    pipeValue: null,
    raw: customer as Record<string, unknown>,
  };
}

export function mapShopifyWebhookPayload(
  payload: unknown,
  topic: string | null,
): ShopifyMappedLead | null {
  const record = asRecord(payload);
  if (!record) return null;
  const normalized = (topic ?? "").toLowerCase();
  if (normalized.startsWith("customers/")) {
    return mapShopifyCustomer(record as ShopifyCustomer);
  }
  if (record.line_items || record.total_price || record.order_number || record.name) {
    return mapShopifyOrder(record as ShopifyOrder);
  }
  if (record.first_name || record.default_address) {
    return mapShopifyCustomer(record as ShopifyCustomer);
  }
  return mapShopifyOrder(record as ShopifyOrder);
}

export function verifyShopifyHmac(
  rawBody: string,
  hmacHeader: string | null,
  apiSecret: string | undefined,
) {
  const secret = apiSecret?.trim();
  if (!secret) {
    return true;
  }
  if (!hmacHeader?.trim()) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(hmacHeader.trim()));
  } catch {
    return false;
  }
}

async function ingestMapped(params: {
  organizationId: string;
  connectionId: string;
  lead: ShopifyMappedLead;
  suppressOwnerNotify: boolean;
}) {
  return ingestInboundLead({
    organizationId: params.organizationId,
    channel: "SHOPIFY",
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
    utmSource: "shopify",
    utmMedium: "store",
    rawPayload: params.lead.raw,
  });
}

export async function processShopifyLeadWebhook(params: {
  webhookSecret: string;
  payload: unknown;
  topic: string | null;
  hmacHeader: string | null;
  rawBody: string;
}) {
  const connection = await findLeadConnectionByWebhookSecret({
    channel: "SHOPIFY",
    secret: params.webhookSecret,
  });
  if (!connection) {
    return { ok: false as const, reason: "unknown_webhook" as const };
  }
  const pull = parseShopifyPullConfig(connection.config);
  if (!verifyShopifyHmac(params.rawBody, params.hmacHeader, pull?.apiSecret)) {
    return { ok: false as const, reason: "bad_signature" as const };
  }
  const mapped = mapShopifyWebhookPayload(params.payload, params.topic);
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
      lastSyncError: result.lead ? null : "Shopify webhook had no usable phone",
      syncStatus: result.lead ? "IDLE" : "ERROR",
    },
  });
  return { ok: true as const, created: result.created, leadId: result.lead?.id ?? null };
}

function shopifyAdminUrl(shopDomain: string, path: string) {
  const version = shopifyApiVersion();
  return `https://${shopDomain}/admin/api/${version}${path}`;
}

async function shopifyGet(shopDomain: string, accessToken: string, path: string) {
  const response = await fetch(shopifyAdminUrl(shopDomain, path), {
    headers: {
      Accept: "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    cache: "no-store",
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const errors = json.errors;
    const message =
      typeof errors === "string"
        ? errors
        : `Shopify API ${response.status}`;
    throw new Error(message);
  }
  return json;
}

export async function verifyShopifyCredentials(params: {
  shopDomain: string;
  accessToken: string;
}) {
  try {
    const json = await shopifyGet(
      params.shopDomain,
      params.accessToken,
      "/shop.json",
    );
    const shop = asRecord(json.shop);
    return {
      ok: true as const,
      shopName:
        (typeof shop?.name === "string" && shop.name) || params.shopDomain,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Shopify token check failed",
    };
  }
}

export async function registerShopifyLeadWebhooks(params: {
  shopDomain: string;
  accessToken: string;
  webhookUrl: string;
}) {
  const topics = ["orders/create", "customers/create"];
  const existing = await shopifyGet(
    params.shopDomain,
    params.accessToken,
    "/webhooks.json",
  );
  const current = Array.isArray(existing.webhooks)
    ? (existing.webhooks as Array<{ topic?: string; address?: string }>)
    : [];

  for (const topic of topics) {
    const already = current.some(
      (row) => row.topic === topic && row.address === params.webhookUrl,
    );
    if (already) continue;
    const response = await fetch(shopifyAdminUrl(params.shopDomain, "/webhooks.json"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": params.accessToken,
      },
      body: JSON.stringify({
        webhook: {
          topic,
          address: params.webhookUrl,
          format: "json",
        },
      }),
    });
    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as {
        errors?: unknown;
      };
      const message =
        typeof json.errors === "string"
          ? json.errors
          : `Shopify webhook ${topic} ${response.status}`;
      return { ok: false as const, message };
    }
  }
  return { ok: true as const };
}

export async function pullShopifyLeads(params: {
  organizationId: string;
  forceFull?: boolean;
  allowDisabled?: boolean;
}): Promise<LeadPullResult> {
  const connection = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId: params.organizationId,
        channel: "SHOPIFY",
      },
    },
  });
  if (!connection || (!connection.enabled && !params.allowDisabled)) {
    return { ok: false, reason: "connection_disabled" };
  }
  const pull = parseShopifyPullConfig(connection.config);
  if (!pull) {
    return { ok: false, reason: "missing_credentials" };
  }

  await prisma.leadIngestConnection.update({
    where: { id: connection.id },
    data: { syncStatus: "SYNCING", lastSyncError: null },
  });

  try {
    const limit = params.forceFull ? 100 : 50;
    const json = await shopifyGet(
      pull.shopDomain,
      pull.accessToken,
      `/orders.json?status=any&limit=${limit}`,
    );
    const orders = Array.isArray(json.orders) ? (json.orders as ShopifyOrder[]) : [];
    const counts: LeadSyncCounts = { processed: 0, created: 0, updated: 0, skipped: 0 };
    for (const order of orders) {
      const mapped = mapShopifyOrder(order);
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
    const message = error instanceof Error ? error.message : "Shopify pull failed";
    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: { syncStatus: "ERROR", lastSyncError: message },
    });
    return { ok: false, reason: message };
  }
}

export { shopifyLeadWebhookUrl };
