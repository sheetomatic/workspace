/**
 * Sheetomatic Official WhatsApp API — CRM campaign client.
 *
 * Spec: POST /api/v1/whatsapp/sendMessage (TemplateMessage)
 *       POST /api/v1/messageTemplate/getTemplates
 * Auth: x-api-key; x-phone-id when Phone ID is set.
 * Credits: no balance GET. Insufficient Balance arrives on send.
 *
 * Do not use MAS / Web Based API / /whatsapp/meta/sendMessage here.
 */

import {
  redlavaRequest,
  resolveRedlavaCredentials,
  type RedlavaCredentials,
} from "@/lib/integrations/redlava";
import { normalizeWhatsAppPhone } from "@/lib/phone";

export const OFFICIAL_WA_SEND_PATH = "/whatsapp/sendMessage";
export const OFFICIAL_WA_TEMPLATES_PATH = "/messageTemplate/getTemplates";

export const META_MARKETING_ENGAGEMENT_CODE = "131049";

export type OfficialWaTemplate = {
  name: string;
  language: string;
  status: string;
  category: string;
  body: string;
  variableCount: number;
};

export type OfficialWaSendResult = {
  ok: boolean;
  http: number;
  waMessageId: string;
  userMessageId: string;
  error: string;
  errorCode: string | null;
  insufficientBalance: boolean;
  marketingEngagementBlock: boolean;
  pauseCampaign: boolean;
};

export function extractTemplatePlaceholders(body: string): number {
  const matches = body.match(/\{\{(\d+)\}\}/g) ?? [];
  let max = 0;
  for (const token of matches) {
    const n = Number(token.replace(/\D/g, ""));
    if (Number.isFinite(n) && n > max) {
      max = n;
    }
  }
  return max;
}

export function normalizeOfficialTemplateStatus(value: unknown): string {
  return String(value ?? "UNKNOWN").trim().toUpperCase();
}

export function isApprovedOfficialTemplate(template: Pick<OfficialWaTemplate, "status">) {
  return normalizeOfficialTemplateStatus(template.status) === "APPROVED";
}

function nestedTemplate(item: Record<string, unknown>): Record<string, unknown> {
  const nested = item.template;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return item;
}

function templateBodyText(item: Record<string, unknown>): string {
  const nested = nestedTemplate(item);
  const components = Array.isArray(nested.components)
    ? nested.components
    : Array.isArray(item.components)
      ? item.components
      : [];
  for (const component of components) {
    if (!component || typeof component !== "object") continue;
    const row = component as Record<string, unknown>;
    if (String(row.type ?? "").toUpperCase() === "BODY" && typeof row.text === "string") {
      return row.text;
    }
  }
  return typeof nested.body === "string" ? nested.body : "";
}

export function parseOfficialTemplateList(body: unknown): OfficialWaTemplate[] {
  const root =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const list = Array.isArray(root.results)
    ? root.results
    : Array.isArray(body)
      ? body
      : [];

  const out: OfficialWaTemplate[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const nested = nestedTemplate(item);
    const name = String(nested.name ?? item.name ?? "").trim();
    if (!name) continue;
    const bodyText = templateBodyText(item);
    out.push({
      name,
      language: String(nested.language ?? item.language ?? "en").trim() || "en",
      status: normalizeOfficialTemplateStatus(nested.status ?? item.status),
      category: String(nested.category ?? item.category ?? "").trim().toUpperCase(),
      body: bodyText,
      variableCount: extractTemplatePlaceholders(bodyText),
    });
  }
  return out;
}

function errorObject(body: Record<string, unknown>): Record<string, unknown> | null {
  if (body.error && typeof body.error === "object") {
    return body.error as Record<string, unknown>;
  }
  return null;
}

function collectErrorBlob(body: Record<string, unknown>, raw: string): string {
  return `${JSON.stringify(body)} ${raw}`.toLowerCase();
}

function errorCodeFromBody(body: Record<string, unknown>): string | null {
  const err = errorObject(body);
  const candidates = [
    err?.code,
    err?.errorSubcode,
    (err?.error as Record<string, unknown> | undefined)?.code,
    body.code,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  const blob = collectErrorBlob(body, "");
  const match = blob.match(/\b131049\b/);
  return match ? META_MARKETING_ENGAGEMENT_CODE : null;
}

export function isInsufficientBalanceBody(body: Record<string, unknown>, raw = ""): boolean {
  const err = errorObject(body);
  const title = String(err?.title ?? body.title ?? "");
  if (title.toLowerCase() === "insufficient balance") {
    return true;
  }
  return /insufficient balance/i.test(collectErrorBlob(body, raw));
}

export function isMarketingEngagementBlock(
  body: Record<string, unknown>,
  raw = "",
): boolean {
  if (errorCodeFromBody(body) === META_MARKETING_ENGAGEMENT_CODE) {
    return true;
  }
  return /\b131049\b/.test(collectErrorBlob(body, raw));
}

export function officialWaSendUserMessage(params: {
  insufficientBalance: boolean;
  marketingEngagementBlock: boolean;
  error: string;
  category?: string | null;
}): string {
  if (params.insufficientBalance) {
    return "WhatsApp wallet has insufficient balance. Recharge on wa.sheetomatic.com, then resume. Remaining people were not sent.";
  }
  if (params.marketingEngagementBlock) {
    return "Meta blocked this marketing send (131049). This person has not engaged recently. Use an approved UTILITY template, or wait until they message you.";
  }
  return params.error || "WhatsApp send failed.";
}

export function interpretOfficialWaSend(params: {
  ok: boolean;
  http: number;
  body: Record<string, unknown>;
  raw?: string;
  userMessageId?: string;
}): OfficialWaSendResult {
  const body = params.body ?? {};
  const raw = params.raw ?? "";
  const err = errorObject(body);
  const insufficientBalance = isInsufficientBalanceBody(body, raw);
  const marketingEngagementBlock = isMarketingEngagementBlock(body, raw);
  const waMessageId = String(
    body.waMessageId ?? body.id ?? "",
  ).trim();
  const userMessageId = String(
    body.userMessageId ?? params.userMessageId ?? "",
  ).trim();
  const errorText = String(
    err?.title ??
      err?.message ??
      err?.details ??
      body.detail ??
      body.message ??
      body.title ??
      "",
  ).trim();

  if (insufficientBalance) {
    return {
      ok: false,
      http: params.http || 200,
      waMessageId,
      userMessageId,
      error: officialWaSendUserMessage({
        insufficientBalance: true,
        marketingEngagementBlock: false,
        error: errorText,
      }),
      errorCode: "INSUFFICIENT_BALANCE",
      insufficientBalance: true,
      marketingEngagementBlock: false,
      pauseCampaign: true,
    };
  }

  if (marketingEngagementBlock) {
    return {
      ok: false,
      http: params.http || 400,
      waMessageId,
      userMessageId,
      error: officialWaSendUserMessage({
        insufficientBalance: false,
        marketingEngagementBlock: true,
        error: errorText,
      }),
      errorCode: META_MARKETING_ENGAGEMENT_CODE,
      insufficientBalance: false,
      marketingEngagementBlock: true,
      pauseCampaign: false,
    };
  }

  if (params.ok && !err && (waMessageId || params.http === 200)) {
    return {
      ok: Boolean(waMessageId) || params.http === 200,
      http: params.http,
      waMessageId,
      userMessageId,
      error: waMessageId ? "" : errorText || "WhatsApp accepted the send without a message id.",
      errorCode: null,
      insufficientBalance: false,
      marketingEngagementBlock: false,
      pauseCampaign: false,
    };
  }

  return {
    ok: false,
    http: params.http,
    waMessageId,
    userMessageId,
    error: errorText || `WhatsApp send failed (${params.http || 0}).`,
    errorCode: errorCodeFromBody(body),
    insufficientBalance: false,
    marketingEngagementBlock: false,
    pauseCampaign: params.http === 401,
  };
}

export function buildOfficialTemplatePayload(params: {
  to: string;
  templateName: string;
  language: string;
  templateVariables?: string[];
  userMessageId?: string;
  metaMediaId?: string | null;
}) {
  const payload: {
    to: string;
    templateName: string;
    language: string;
    templateVariables?: string[];
    userMessageId?: string;
    metaMediaId?: string;
  } = {
    to: params.to,
    templateName: params.templateName,
    language: params.language || "en",
  };
  if (params.templateVariables?.length) {
    payload.templateVariables = params.templateVariables.map((value) =>
      String(value ?? ""),
    );
  }
  if (params.userMessageId) {
    payload.userMessageId = params.userMessageId;
  }
  if (params.metaMediaId?.trim()) {
    payload.metaMediaId = params.metaMediaId.trim();
  }
  return payload;
}

export async function listOfficialApprovedTemplates(
  credentials?: RedlavaCredentials | null,
): Promise<{
  ok: boolean;
  templates: OfficialWaTemplate[];
  error?: string;
  missingKey?: boolean;
}> {
  if (!resolveRedlavaCredentials(credentials)?.apiKey) {
    return {
      ok: false,
      templates: [],
      missingKey: true,
      error:
        "Official API key is not set. Add this workspace’s key in WhatsApp Settings — never another client’s key.",
    };
  }

  const result = await redlavaRequest(
    OFFICIAL_WA_TEMPLATES_PATH,
    {
      method: "POST",
      body: {
        pagination: { current: 1, pageSize: 100 },
        order: [],
        search: [],
      },
    },
    credentials,
  );

  if (!result.ok) {
    return {
      ok: false,
      templates: [],
      error: result.error || "Could not load templates from Official API.",
    };
  }

  return {
    ok: true,
    templates: parseOfficialTemplateList(result.body).filter(isApprovedOfficialTemplate),
  };
}

export async function sendOfficialTemplateMessage(
  params: {
    toPhone: string;
    templateName: string;
    language: string;
    templateVariables?: string[];
    userMessageId?: string;
    metaMediaId?: string | null;
  },
  credentials?: RedlavaCredentials | null,
): Promise<OfficialWaSendResult> {
  const resolved = resolveRedlavaCredentials(credentials);
  if (!resolved?.apiKey) {
    return {
      ok: false,
      http: 0,
      waMessageId: "",
      userMessageId: params.userMessageId ?? "",
      error:
        "Official API key is not set. Add this workspace’s key in WhatsApp Settings — never another client’s key.",
      errorCode: "NOT_CONFIGURED",
      insufficientBalance: false,
      marketingEngagementBlock: false,
      pauseCampaign: true,
    };
  }

  const to = normalizeWhatsAppPhone(params.toPhone);
  if (!to) {
    return {
      ok: false,
      http: 0,
      waMessageId: "",
      userMessageId: params.userMessageId ?? "",
      error: "Invalid mobile number.",
      errorCode: "INVALID_PHONE",
      insufficientBalance: false,
      marketingEngagementBlock: false,
      pauseCampaign: false,
    };
  }

  const payload = buildOfficialTemplatePayload({
    to,
    templateName: params.templateName,
    language: params.language,
    templateVariables: params.templateVariables,
    userMessageId: params.userMessageId,
    metaMediaId: params.metaMediaId,
  });

  const result = await redlavaRequest(
    OFFICIAL_WA_SEND_PATH,
    { method: "POST", body: payload },
    credentials,
  );

  return interpretOfficialWaSend({
    ok: result.ok,
    http: result.status,
    body: result.body,
    raw: result.raw,
    userMessageId: params.userMessageId,
  });
}
