import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import {
  asConfigRecord,
  metaGraphVersion,
  parseFormIds,
  parseMetaLeadAdsConfig,
  readString,
  type MetaLeadAdsConfig,
} from "@/lib/leads/connection-config";
import { ingestInboundLead } from "@/lib/leads/ingest";
import type { LeadSourceChannel } from "@prisma/client";

type MetaConnectionRow = {
  id: string;
  organizationId: string;
  channel: LeadSourceChannel;
  enabled: boolean;
  config: unknown;
};

function fieldMap(fieldData: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(fieldData)) {
    return out;
  }
  for (const field of fieldData) {
    if (!field || typeof field !== "object") continue;
    const name = String((field as { name?: unknown }).name ?? "").trim();
    const values = (field as { values?: unknown }).values;
    const value = Array.isArray(values)
      ? String(values[0] ?? "").trim()
      : "";
    if (name && value) {
      out[name.toLowerCase()] = value;
      out[name] = value;
    }
  }
  return out;
}

function pickField(map: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = map[key] ?? map[key.toLowerCase()];
    if (value?.trim()) return value.trim();
  }
  return null;
}

export async function findMetaLeadConnectionByVerifyToken(verifyToken: string) {
  const token = verifyToken.trim();
  if (!token) return null;

  const byPath = await prisma.leadIngestConnection.findMany({
    where: {
      channel: { in: ["FACEBOOK", "INSTAGRAM"] },
      config: { path: ["verifyToken"], equals: token },
    },
    select: {
      id: true,
      organizationId: true,
      channel: true,
      enabled: true,
      config: true,
    },
  });

  const match = byPath.find((row) => {
    const config = parseMetaLeadAdsConfig(row.config);
    return config?.verifyToken === token;
  });
  if (match) return match;

  // Fallback for configs that stored verifyToken under alternate shapes.
  const rows = await prisma.leadIngestConnection.findMany({
    where: {
      channel: { in: ["FACEBOOK", "INSTAGRAM"] },
    },
    select: {
      id: true,
      organizationId: true,
      channel: true,
      enabled: true,
      config: true,
    },
  });

  return (
    rows.find((row) => {
      const config = parseMetaLeadAdsConfig(row.config);
      return config?.verifyToken === token;
    }) ?? null
  );
}

export async function findMetaLeadConnectionsByPageId(pageId: string) {
  const id = pageId.trim();
  if (!id) return [];

  const byPath = await prisma.leadIngestConnection.findMany({
    where: {
      channel: { in: ["FACEBOOK", "INSTAGRAM"] },
      enabled: true,
      config: { path: ["pageId"], equals: id },
    },
    select: {
      id: true,
      organizationId: true,
      channel: true,
      enabled: true,
      config: true,
    },
  });

  const filtered = byPath.filter((row) => {
    const config = parseMetaLeadAdsConfig(row.config);
    return config?.pageId === id;
  });
  if (filtered.length > 0) return filtered;

  const rows = await prisma.leadIngestConnection.findMany({
    where: {
      channel: { in: ["FACEBOOK", "INSTAGRAM"] },
      enabled: true,
    },
    select: {
      id: true,
      organizationId: true,
      channel: true,
      enabled: true,
      config: true,
    },
  });

  return rows.filter((row) => {
    const config = parseMetaLeadAdsConfig(row.config);
    return config?.pageId === id;
  });
}

export function verifyMetaLeadSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined,
) {
  const secret = appSecret?.trim() || process.env.META_APP_SECRET?.trim();
  if (!secret) {
    // App secret optional — page token + verify token still bind the tenant.
    return true;
  }
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  try {
    return timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(provided, "utf8"),
    );
  } catch {
    return false;
  }
}

/** Resolve app secret for webhook HMAC from matching connections or env. */
export function resolveMetaWebhookAppSecret(
  connections: Array<{ config: unknown }>,
) {
  const fromConnection = connections
    .map((row) => parseMetaLeadAdsConfig(row.config)?.appSecret)
    .find((s) => s?.trim());
  return fromConnection?.trim() || process.env.META_APP_SECRET?.trim() || undefined;
}

async function fetchMetaLeadDetails(
  leadgenId: string,
  pageAccessToken: string,
) {
  const version = metaGraphVersion();
  const url = new URL(`https://graph.facebook.com/${version}/${leadgenId}`);
  url.searchParams.set(
    "fields",
    "id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data,platform",
  );
  url.searchParams.set("access_token", pageAccessToken);

  const response = await fetch(url.toString(), { method: "GET" });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof json.error === "object" &&
      json.error &&
      typeof (json.error as { message?: unknown }).message === "string"
        ? (json.error as { message: string }).message
        : `Graph API ${response.status}`;
    throw new Error(message);
  }
  return json;
}

export async function verifyMetaPageAccessToken(params: {
  pageId: string;
  pageAccessToken: string;
}) {
  const version = metaGraphVersion();
  const url = new URL(
    `https://graph.facebook.com/${version}/${params.pageId.trim()}`,
  );
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("access_token", params.pageAccessToken.trim());

  const response = await fetch(url.toString(), { method: "GET" });
  const json = (await response.json()) as {
    id?: string;
    name?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    return {
      ok: false as const,
      message: json.error?.message ?? `Graph API ${response.status}`,
    };
  }

  if (json.id && json.id !== params.pageId.trim()) {
    return {
      ok: false as const,
      message: "Page ID does not match the token’s page.",
    };
  }

  return {
    ok: true as const,
    pageName: json.name ?? params.pageId,
  };
}

function allowsForm(config: MetaLeadAdsConfig, formId: string | null) {
  if (!config.formIds.length) return true;
  if (!formId) return false;
  return config.formIds.includes(formId);
}

function resolveChannel(
  connection: MetaConnectionRow,
  platform: string | null,
): LeadSourceChannel {
  if (connection.channel === "INSTAGRAM" || connection.channel === "FACEBOOK") {
    return connection.channel;
  }
  const normalized = platform?.toLowerCase() ?? "";
  if (normalized.includes("instagram") || normalized === "ig") {
    return "INSTAGRAM";
  }
  return "FACEBOOK";
}

export async function processMetaLeadgenEvent(params: {
  pageId: string;
  leadgenId: string;
  formId?: string | null;
  rawEntry: unknown;
}) {
  const connections = await findMetaLeadConnectionsByPageId(params.pageId);
  if (!connections.length) {
    return { processed: 0, skipped: "no_connection" as const };
  }

  let processed = 0;

  for (const connection of connections) {
    const config = parseMetaLeadAdsConfig(connection.config);
    if (!config || !connection.enabled) continue;
    if (!allowsForm(config, params.formId ?? null)) continue;

    try {
      const details = await fetchMetaLeadDetails(
        params.leadgenId,
        config.pageAccessToken,
      );
      const formId =
        typeof details.form_id === "string"
          ? details.form_id
          : params.formId ?? null;
      if (!allowsForm(config, formId)) continue;

      const fields = fieldMap(details.field_data);
      const name = pickField(fields, [
        "full_name",
        "full name",
        "name",
        "first_name",
      ]);
      const first = pickField(fields, ["first_name", "firstname"]);
      const last = pickField(fields, ["last_name", "lastname"]);
      const phone = pickField(fields, [
        "phone_number",
        "phone",
        "mobile_number",
        "mobile",
      ]);
      const email = pickField(fields, ["email", "email_address"]);
      const city = pickField(fields, ["city", "town"]);
      const company = pickField(fields, ["company_name", "company"]);
      const requirement = pickField(fields, [
        "requirement",
        "message",
        "notes",
        "what_is_your_requirement",
      ]);
      const platform =
        typeof details.platform === "string" ? details.platform : null;
      const inferred = resolveChannel(connection, platform);

      // When both channels are enabled for the same page, only ingest once.
      if (connections.length > 1) {
        const wantsInstagram = Boolean(
          platform &&
            (platform.toLowerCase().includes("instagram") ||
              platform.toLowerCase() === "ig"),
        );
        const targetChannel: LeadSourceChannel = wantsInstagram
          ? "INSTAGRAM"
          : "FACEBOOK";
        if (connection.channel !== targetChannel) {
          const hasTarget = connections.some((c) => c.channel === targetChannel);
          if (hasTarget) continue;
        }
      }

      const channel = inferred;
      const displayName =
        name || [first, last].filter(Boolean).join(" ").trim() || null;

      const result = await ingestInboundLead({
        organizationId: connection.organizationId,
        channel,
        connectionId: connection.id,
        skipConnectionSetup: true,
        externalId: String(details.id ?? params.leadgenId),
        name: displayName,
        phone,
        email,
        city,
        company,
        requirement,
        sourceDetail:
          typeof details.ad_name === "string"
            ? details.ad_name
            : typeof details.campaign_name === "string"
              ? details.campaign_name
              : "Meta Lead Ads",
        campaign:
          typeof details.campaign_name === "string"
            ? details.campaign_name
            : null,
        utmSource: channel === "INSTAGRAM" ? "instagram" : "facebook",
        utmMedium: "lead_ads",
        utmCampaign:
          typeof details.campaign_id === "string" ? details.campaign_id : null,
        utmContent: typeof details.ad_id === "string" ? details.ad_id : null,
        capturedAt:
          typeof details.created_time === "string"
            ? new Date(details.created_time)
            : new Date(),
        rawPayload: {
          leadgenId: params.leadgenId,
          pageId: params.pageId,
          formId,
          entry: params.rawEntry,
          details,
        } as object,
      });

      if (result.lead) {
        processed += 1;
        await prisma.leadIngestConnection.update({
          where: { id: connection.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncError: null,
            syncStatus: "IDLE",
          },
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Meta lead ingest failed";
      await prisma.leadIngestConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncError: message,
          syncStatus: "ERROR",
        },
      });
    }
  }

  return { processed, skipped: processed === 0 ? ("no_lead" as const) : null };
}

export function extractMetaLeadgenJobs(payload: unknown): Array<{
  pageId: string;
  leadgenId: string;
  formId: string | null;
  rawEntry: unknown;
}> {
  const jobs: Array<{
    pageId: string;
    leadgenId: string;
    formId: string | null;
    rawEntry: unknown;
  }> = [];

  if (!payload || typeof payload !== "object") return jobs;
  const entry = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entry)) return jobs;

  for (const item of entry) {
    if (!item || typeof item !== "object") continue;
    const pageId = String((item as { id?: unknown }).id ?? "").trim();
    const changes = (item as { changes?: unknown }).changes;
    if (!pageId || !Array.isArray(changes)) continue;

    for (const change of changes) {
      if (!change || typeof change !== "object") continue;
      const field = String((change as { field?: unknown }).field ?? "");
      if (field !== "leadgen") continue;
      const value = (change as { value?: unknown }).value;
      if (!value || typeof value !== "object") continue;
      const leadgenId = String(
        (value as { leadgen_id?: unknown }).leadgen_id ?? "",
      ).trim();
      if (!leadgenId) continue;
      const formIdRaw = (value as { form_id?: unknown }).form_id;
      jobs.push({
        pageId,
        leadgenId,
        formId: typeof formIdRaw === "string" ? formIdRaw : null,
        rawEntry: item,
      });
    }
  }

  return jobs;
}

export function mergeMetaLeadAdsConfig(params: {
  existing: unknown;
  pageId: string;
  pageAccessToken: string;
  verifyToken: string;
  formIds: string;
  appSecret?: string;
  keepExistingToken?: boolean;
}) {
  const current = asConfigRecord(params.existing);
  const existingToken = readString(current, "pageAccessToken");
  const token =
    params.pageAccessToken.trim() ||
    (params.keepExistingToken ? existingToken : "");
  const existingSecret = readString(current, "appSecret");
  const appSecret =
    params.appSecret?.trim() ||
    (params.keepExistingToken ? existingSecret : "") ||
    undefined;

  return {
    pageId: params.pageId.trim(),
    pageAccessToken: token,
    verifyToken: params.verifyToken.trim(),
    formIds: parseFormIds(params.formIds),
    ...(appSecret ? { appSecret } : {}),
  };
}

async function graphGet(
  path: string,
  pageAccessToken: string,
  search: Record<string, string>,
) {
  const url = new URL(`https://graph.facebook.com/${metaGraphVersion()}${path}`);
  for (const [key, value] of Object.entries(search)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", pageAccessToken);
  const response = await fetch(url.toString(), { method: "GET" });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof json.error === "object" &&
      json.error &&
      typeof (json.error as { message?: unknown }).message === "string"
        ? (json.error as { message: string }).message
        : `Graph API ${response.status}`;
    throw new Error(message);
  }
  return json;
}

async function ingestGraphLeadRecord(params: {
  connection: MetaConnectionRow;
  details: Record<string, unknown>;
  pageId: string;
}) {
  const fields = fieldMap(params.details.field_data);
  const name = pickField(fields, ["full_name", "full name", "name", "first_name"]);
  const first = pickField(fields, ["first_name", "firstname"]);
  const last = pickField(fields, ["last_name", "lastname"]);
  const phone = pickField(fields, [
    "phone_number",
    "phone",
    "mobile_number",
    "mobile",
  ]);
  const email = pickField(fields, ["email", "email_address"]);
  const city = pickField(fields, ["city", "town"]);
  const company = pickField(fields, ["company_name", "company"]);
  const requirement = pickField(fields, [
    "requirement",
    "message",
    "notes",
    "what_is_your_requirement",
  ]);
  const platform =
    typeof params.details.platform === "string" ? params.details.platform : null;
  const channel = resolveChannel(params.connection, platform);
  const displayName =
    name || [first, last].filter(Boolean).join(" ").trim() || null;

  return ingestInboundLead({
    organizationId: params.connection.organizationId,
    channel,
    connectionId: params.connection.id,
    skipConnectionSetup: true,
    suppressOwnerNotify: true,
    externalId: String(params.details.id ?? ""),
    name: displayName,
    phone,
    email,
    city,
    company,
    requirement,
    sourceDetail:
      typeof params.details.ad_name === "string"
        ? params.details.ad_name
        : typeof params.details.campaign_name === "string"
          ? params.details.campaign_name
          : "Meta Lead Ads",
    campaign:
      typeof params.details.campaign_name === "string"
        ? params.details.campaign_name
        : null,
    utmSource: channel === "INSTAGRAM" ? "instagram" : "facebook",
    utmMedium: "lead_ads",
    utmCampaign:
      typeof params.details.campaign_id === "string"
        ? params.details.campaign_id
        : null,
    capturedAt:
      typeof params.details.created_time === "string"
        ? new Date(params.details.created_time)
        : new Date(),
    rawPayload: {
      pageId: params.pageId,
      details: params.details,
    } as object,
  });
}

/** Catch-up pull when the leadgen webhook was missed. Uses the tenant Page token. */
export async function pullMetaLeadAds(params: {
  organizationId: string;
  channel: "FACEBOOK" | "INSTAGRAM";
  allowDisabled?: boolean;
}): Promise<import("@/lib/leads/sync-messages").LeadPullResult> {
  const connection = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: {
        organizationId: params.organizationId,
        channel: params.channel,
      },
    },
  });
  if (!connection || (!connection.enabled && !params.allowDisabled)) {
    return { ok: false, reason: "connection_disabled" };
  }
  const config = parseMetaLeadAdsConfig(connection.config);
  if (!config) {
    return { ok: false, reason: "missing_credentials" };
  }

  await prisma.leadIngestConnection.update({
    where: { id: connection.id },
    data: { syncStatus: "SYNCING", lastSyncError: null },
  });

  try {
    const formsJson = await graphGet(`/${config.pageId}/leadgen_forms`, config.pageAccessToken, {
      fields: "id,name,status",
      limit: "25",
    });
    const forms = Array.isArray(formsJson.data)
      ? (formsJson.data as Array<{ id?: string }>)
      : [];
    const allowed = config.formIds;
    const formIds = forms
      .map((form) => String(form.id ?? "").trim())
      .filter((id) => id && (allowed.length === 0 || allowed.includes(id)));

    const counts = { processed: 0, created: 0, updated: 0, skipped: 0 };
    for (const formId of formIds.slice(0, 10)) {
      const leadsJson = await graphGet(`/${formId}/leads`, config.pageAccessToken, {
        fields:
          "id,created_time,ad_id,ad_name,campaign_id,campaign_name,form_id,field_data,platform",
        limit: "25",
      });
      const leads = Array.isArray(leadsJson.data)
        ? (leadsJson.data as Record<string, unknown>[])
        : [];
      for (const details of leads) {
        if (!details.id) continue;
        const result = await ingestGraphLeadRecord({
          connection,
          details,
          pageId: config.pageId,
        });
        if (result.skipped || !result.lead) {
          counts.skipped += 1;
          continue;
        }
        counts.processed += 1;
        if (result.created) counts.created += 1;
        else counts.updated += 1;
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
    return { ok: true, imported: counts.processed, counts };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta Lead Ads pull failed";
    await prisma.leadIngestConnection.update({
      where: { id: connection.id },
      data: { syncStatus: "ERROR", lastSyncError: message },
    });
    return { ok: false, reason: message };
  }
}
