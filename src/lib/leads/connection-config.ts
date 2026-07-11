import { createHash, randomBytes } from "crypto";
import { maskSecret } from "@/lib/whatsapp-settings-form";

export type MetaLeadAdsConfig = {
  pageId: string;
  pageAccessToken: string;
  verifyToken: string;
  /** Optional comma-separated form IDs; empty = all forms on the page. */
  formIds: string[];
  appSecret?: string;
};

export type TelegramLeadConfig = {
  botToken: string;
  /** Public webhook path secret (plain only at create time). */
  webhookSecret: string;
};

export type LeadSourceStatus = "connected" | "needs_setup" | "error" | "disabled";

export function asConfigRecord(
  config: unknown,
): Record<string, unknown> {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

export function readString(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === "string" ? value.trim() : "";
}

export function parseFormIds(raw: string | string[] | undefined): string[] {
  if (Array.isArray(raw)) {
    return raw.map((id) => String(id).trim()).filter(Boolean);
  }
  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }
  return raw
    .split(/[,\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

export function parseMetaLeadAdsConfig(config: unknown): MetaLeadAdsConfig | null {
  const record = asConfigRecord(config);
  const pageId = readString(record, "pageId");
  const pageAccessToken = readString(record, "pageAccessToken");
  const verifyToken = readString(record, "verifyToken");
  if (!pageId || !pageAccessToken || !verifyToken) {
    return null;
  }
  return {
    pageId,
    pageAccessToken,
    verifyToken,
    formIds: parseFormIds(
      (record.formIds as string | string[] | undefined) ??
        readString(record, "formIds"),
    ),
    appSecret: readString(record, "appSecret") || undefined,
  };
}

export function parseTelegramLeadConfig(config: unknown): TelegramLeadConfig | null {
  const record = asConfigRecord(config);
  const botToken = readString(record, "botToken");
  const webhookSecret = readString(record, "webhookSecret");
  if (!botToken || !webhookSecret) {
    return null;
  }
  return { botToken, webhookSecret };
}

export function hashLeadWebhookSecret(secret: string) {
  return createHash("sha256").update(secret.trim()).digest("hex");
}

export function generateLeadWebhookSecret(prefix = "lwh") {
  const raw = `${prefix}_${randomBytes(24).toString("hex")}`;
  return {
    secret: raw,
    hash: hashLeadWebhookSecret(raw),
    hint: raw.slice(-4),
  };
}

export function generateMetaVerifyToken() {
  return `meta_vt_${randomBytes(16).toString("hex")}`;
}

export function maskTokenHint(value: string | null | undefined) {
  const masked = maskSecret(value);
  return masked || null;
}

export function publicSiteUrl() {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (site) {
    return site;
  }
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/\/$/, "");
  if (vercelHost) {
    return `https://${vercelHost}`;
  }
  return "https://sheetomatic.com";
}

export function metaLeadWebhookUrl() {
  return `${publicSiteUrl()}/api/webhooks/meta/leads`;
}

export function telegramLeadWebhookUrl(webhookSecret: string) {
  return `${publicSiteUrl()}/api/webhooks/telegram/leads/${encodeURIComponent(webhookSecret)}`;
}

export function metaGraphVersion() {
  return process.env.META_GRAPH_API_VERSION?.trim() || "v21.0";
}
