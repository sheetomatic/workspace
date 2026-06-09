/**
 * RedLava WhatsApp API (wa.redlava.in)
 * @see https://wa.redlava.in/Integrations/ApiDocumentation
 */

import { normalizeWhatsAppPhone } from "@/lib/phone";

export type RedlavaCredentials = {
  apiKey?: string | null;
  phoneId?: string | null;
};

export type WhatsAppSendResult =
  | { sent: true; messageId?: string }
  | {
      sent: false;
      reason:
        | "invalid_phone"
        | "not_configured"
        | "phone_id_required"
        | "api_error"
        | "session_required";
      detail?: string;
    };

export const REDLAVA_DEFAULT_SEND_ENDPOINT = "/whatsapp/meta/sendMessage";
export const REDLAVA_DEFAULT_TEMPLATE_LIST_ENDPOINT =
  "/messageTemplate/getTemplates";
export const REDLAVA_DEFAULT_TEMPLATE_SUBMIT_ENDPOINT =
  "/messageTemplate/create";
export const REDLAVA_DEFAULT_TEMPLATE_SYNC_ENDPOINT =
  "/whatsapp/syncTemplatesFromMeta";

export type ParseWhatsAppSendOptions = {
  /** Outbound message type (text, interactive, template, …). */
  messageType?: string;
  /** Template language.code sent to the provider (included in error detail). */
  templateLanguageCode?: string;
};

/** Meta-approved task assignment template — RedLava only accepts language `en`. */
export const ASSIGN_TASK_NEW_TEMPLATE_NAME = "assign_task_new";
export const ASSIGN_TASK_NEW_TEMPLATE_LANGUAGE = "en";

function withTemplateLanguageDetail(
  detail: string | undefined,
  languageCode?: string,
): string | undefined {
  if (!languageCode) {
    return detail?.slice(0, 500);
  }
  const prefix = `[lang=${languageCode}] `;
  const body = detail?.slice(0, Math.max(0, 500 - prefix.length)) ?? "";
  return `${prefix}${body}`;
}

/** Turn RedLava / Meta JSON errors into a short operator-facing message. */
export function formatWhatsAppApiErrorDetail(
  raw: string,
  messageType?: string,
): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "WhatsApp send failed with no error detail from the provider.";
  }

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return trimmed.slice(0, 500);
  }

  const title = typeof parsed.title === "string" ? parsed.title : "";
  const detail = typeof parsed.detail === "string" ? parsed.detail : "";
  const error =
    parsed.error && typeof parsed.error === "object"
      ? (parsed.error as Record<string, unknown>)
      : parsed;
  const errorMessage =
    typeof error.message === "string"
      ? error.message
      : typeof parsed.message === "string"
        ? parsed.message
        : "";
  const errorCode = error.code ?? parsed.code;
  const errorData =
    error.error_data && typeof error.error_data === "object"
      ? (error.error_data as Record<string, unknown>)
      : null;
  const errorDetails =
    typeof errorData?.details === "string" ? errorData.details : "";

  const parts = [
    title || errorMessage || "WhatsApp send failed",
    detail,
    errorDetails,
    errorCode != null ? `(code ${errorCode})` : "",
  ].filter(Boolean);

  let message = parts.join(" — ").slice(0, 500);

  const haystack = `${message} ${trimmed}`.toLowerCase();
  const isText = messageType === "text" || !messageType;

  if (
    isText &&
    (haystack.includes("(#100)") ||
      haystack.includes('"code":100') ||
      haystack.includes("invalid parameter"))
  ) {
    message += [
      "",
      "Tip: You cannot send API messages to your own business WhatsApp number — use a different personal mobile in Settings for tests.",
      "Free-text also needs the recipient to message your business line within 24 hours.",
      "Verify Settings → Phone ID is the Meta Phone Number ID from RedLava Connected Accounts.",
    ].join("\n");
  }

  if (haystack.includes("unspecified_phone_number") || haystack.includes("phone_id")) {
    message += "\nTip: Add the correct RedLava Phone ID in AI Settings.";
  }

  return message.slice(0, 900);
}

export function formatWhatsAppSendFailureMessage(
  detail: string | undefined,
  messageType?: string,
): string {
  if (!detail?.trim()) {
    return "Could not send WhatsApp message. Check RedLava API key and Phone ID in Settings.";
  }
  return formatWhatsAppApiErrorDetail(detail, messageType);
}

/** Static-header templates must not include a header component (causes Meta 400). */
function stripStaticHeaderComponents(
  components?: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> | undefined {
  if (!components?.length) {
    return components;
  }
  const filtered = components.filter((component) => component.type !== "header");
  return filtered.length > 0 ? filtered : undefined;
}

/** Belt-and-suspenders: force `en` and drop header components for assign_task_new. */
export function enforceRedlavaTemplateLanguage(
  template: RedlavaWhatsAppTemplatePayload,
): RedlavaWhatsAppTemplatePayload {
  if (template.name !== ASSIGN_TASK_NEW_TEMPLATE_NAME) {
    return template;
  }

  return {
    ...template,
    language: { code: ASSIGN_TASK_NEW_TEMPLATE_LANGUAGE },
    components: stripStaticHeaderComponents(template.components),
  };
}

function isImplicitWhatsAppSendSuccess(body: Record<string, unknown>): boolean {
  if (body.success === true) {
    return true;
  }

  const statusValues = [body.status];
  const data = body.data;
  if (data && typeof data === "object") {
    statusValues.push((data as { status?: unknown }).status);
  }

  for (const status of statusValues) {
    if (typeof status !== "string") {
      continue;
    }
    const normalized = status.toLowerCase();
    if (
      normalized === "sent" ||
      normalized === "success" ||
      normalized === "ok" ||
      normalized === "queued" ||
      normalized === "accepted"
    ) {
      return true;
    }
  }

  return false;
}

function inferMessageTypeFromBody(body: Record<string, unknown>): string | undefined {
  if (typeof body.type === "string") {
    return body.type;
  }

  const message = body.message;
  if (message && typeof message === "object") {
    const nestedType = (message as { type?: unknown }).type;
    if (typeof nestedType === "string") {
      return nestedType;
    }
  }

  return undefined;
}

export function parseWhatsAppSendResponse(
  response: Response,
  raw: string,
  options?: ParseWhatsAppSendOptions,
): WhatsAppSendResult {
  if (!response.ok) {
    if (response.status === 400 && raw.includes("UNSPECIFIED_PHONE_NUMBER")) {
      return {
        sent: false,
        reason: "phone_id_required",
        detail: raw.slice(0, 300),
      };
    }

    return {
      sent: false,
      reason: isWhatsAppSessionRequiredError(raw, options?.messageType)
        ? "session_required"
        : "api_error",
      detail: withTemplateLanguageDetail(
        formatWhatsAppApiErrorDetail(raw, options?.messageType),
        options?.templateLanguageCode,
      ),
    };
  }

  let body: Record<string, unknown> = {};
  try {
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    body = { raw };
  }

  if (body.error) {
    const detail = withTemplateLanguageDetail(
      formatWhatsAppApiErrorDetail(JSON.stringify(body.error), options?.messageType),
      options?.templateLanguageCode,
    );
    return {
      sent: false,
      reason: isWhatsAppSessionRequiredError(detail ?? "", options?.messageType)
        ? "session_required"
        : "api_error",
      detail,
    };
  }

  if (body.success === false) {
    const detail = withTemplateLanguageDetail(
      formatWhatsAppApiErrorDetail(
        (typeof body.message === "string" && body.message) || raw,
        options?.messageType,
      ) ||
        raw.slice(0, 500) ||
        "Send rejected",
      options?.templateLanguageCode,
    );
    return {
      sent: false,
      reason: isWhatsAppSessionRequiredError(detail ?? "", options?.messageType)
        ? "session_required"
        : "api_error",
      detail,
    };
  }

  const messageId = extractWhatsAppMessageId(body);
  if (messageId) {
    return { sent: true, messageId };
  }

  const messageType = options?.messageType ?? inferMessageTypeFromBody(body);

  // Free-text outside the 24h window may be accepted without a wamid — treat as failure
  // so task assignment can fall back to an approved template.
  if (messageType === "text") {
    return {
      sent: false,
      reason: isWhatsAppSessionRequiredError(raw, messageType)
        ? "session_required"
        : "api_error",
      detail: withTemplateLanguageDetail(
        formatWhatsAppApiErrorDetail(
          raw || "Text send accepted without delivery id",
          messageType,
        ),
        options?.templateLanguageCode,
      ),
    };
  }

  if (isImplicitWhatsAppSendSuccess(body) || messageType === "interactive") {
    return { sent: true };
  }

  if (messageType === "template" && response.ok) {
    return {
      sent: true,
      messageId: undefined,
    };
  }

  return {
    sent: false,
    reason: "api_error",
    detail: withTemplateLanguageDetail(
      raw.slice(0, 300) || "No WhatsApp message id in provider response",
      options?.templateLanguageCode,
    ),
  };
}

function extractWhatsAppMessageId(body: Record<string, unknown>): string | null {
  const topMessages = body.messages;
  if (Array.isArray(topMessages)) {
    const id = (topMessages[0] as { id?: string } | undefined)?.id;
    if (id) {
      return id;
    }
  }

  const data = body.data;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    const nestedMessages = nested.messages;
    if (Array.isArray(nestedMessages)) {
      const id = (nestedMessages[0] as { id?: string } | undefined)?.id;
      if (id) {
        return id;
      }
    }
    if (typeof nested.waMessageId === "string" && nested.waMessageId) {
      return nested.waMessageId;
    }
    if (typeof nested.id === "string" && nested.id) {
      return nested.id;
    }
  }

  if (typeof body.messageId === "string" && body.messageId) {
    return body.messageId;
  }
  if (typeof body.wamid === "string" && body.wamid) {
    return body.wamid;
  }
  if (typeof body.waMessageId === "string" && body.waMessageId) {
    return body.waMessageId;
  }
  if (typeof body.id === "string" && body.id) {
    return body.id;
  }

  return null;
}

export function isWhatsAppSessionRequiredError(
  detail: string,
  messageType?: string,
) {
  const haystack = detail.toLowerCase();
  if (
    messageType === "text" &&
    (haystack.includes("(#100)") ||
      haystack.includes('"code":100') ||
      haystack.includes("invalid parameter"))
  ) {
    return true;
  }
  return (
    haystack.includes("131047") ||
    haystack.includes("131026") ||
    haystack.includes("470") ||
    haystack.includes("re-engagement") ||
    haystack.includes("24 hour") ||
    haystack.includes("24-hour") ||
    haystack.includes("outside the allowed window") ||
    (haystack.includes("session") && !haystack.includes("template name"))
  );
}

function redlavaBaseUrl() {
  return (
    process.env.REDLAVA_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    "https://wa.redlava.in/api/v1"
  );
}

function redlavaSendUrl() {
  const endpoint =
    process.env.REDLAVA_SEND_ENDPOINT?.trim() || REDLAVA_DEFAULT_SEND_ENDPOINT;
  return `${redlavaBaseUrl()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

export function redlavaTemplateListEndpoint() {
  return (
    process.env.REDLAVA_TEMPLATE_LIST_ENDPOINT?.trim() ||
    REDLAVA_DEFAULT_TEMPLATE_LIST_ENDPOINT
  );
}

export function redlavaTemplateSubmitEndpoint() {
  return (
    process.env.REDLAVA_TEMPLATE_SUBMIT_ENDPOINT?.trim() ||
    REDLAVA_DEFAULT_TEMPLATE_SUBMIT_ENDPOINT
  );
}

export function redlavaTemplateSyncEndpoint() {
  return (
    process.env.REDLAVA_TEMPLATE_SYNC_ENDPOINT?.trim() ||
    REDLAVA_DEFAULT_TEMPLATE_SYNC_ENDPOINT
  );
}

function redlavaUrl(endpoint: string) {
  return `${redlavaBaseUrl()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

export function resolveRedlavaCredentials(
  input?: RedlavaCredentials | null,
): RedlavaCredentials | null {
  // When org/workspace creds are passed, never merge platform env (tenant isolation).
  const allowEnvFallback = input == null;
  const apiKey =
    input?.apiKey?.trim() ||
    (allowEnvFallback ? process.env.REDLAVA_API_KEY?.trim() : null);
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    phoneId:
      input?.phoneId?.trim() ||
      (allowEnvFallback ? process.env.REDLAVA_PHONE_ID?.trim() : null) ||
      null,
  };
}

function redlavaHeaders(credentials?: RedlavaCredentials | null) {
  const resolved = resolveRedlavaCredentials(credentials);
  if (!resolved?.apiKey) {
    return null;
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": resolved.apiKey,
  };

  if (resolved.phoneId) {
    headers["x-phone-id"] = resolved.phoneId;
  }

  return headers;
}

export async function redlavaRequest(
  endpoint: string,
  init?: { method?: string; body?: unknown },
  credentials?: RedlavaCredentials | null,
) {
  const headers = redlavaHeaders(credentials);
  if (!headers) {
    return {
      ok: false as const,
      status: 0,
      body: {},
      raw: "",
      error: "RedLava is not configured. Add your API key in WhatsApp Settings.",
    };
  }

  const response = await fetch(redlavaUrl(endpoint), {
    method: init?.method ?? "POST",
    headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const raw = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    body = { raw };
  }

  if (!response.ok) {
    const detail =
      (typeof body.message === "string" && body.message) ||
      (typeof body.detail === "string" && body.detail) ||
      raw.slice(0, 300);
    return {
      ok: false as const,
      status: response.status,
      body,
      raw,
      error: detail || `RedLava request failed (${response.status}).`,
    };
  }

  return {
    ok: true as const,
    status: response.status,
    body,
    raw,
  };
}

export function isRedlavaConfigured(credentials?: RedlavaCredentials | null) {
  return Boolean(resolveRedlavaCredentials(credentials)?.apiKey);
}

/** Download inbound WhatsApp media (voice notes, images) via RedLava's Meta proxy. */
export async function downloadRedlavaWhatsAppMedia(
  mediaId: string,
  credentials?: RedlavaCredentials | null,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const resolved = resolveRedlavaCredentials(credentials);
  if (!resolved?.apiKey) {
    return null;
  }

  const response = await fetch(
    `${redlavaBaseUrl()}/whatsapp/meta/media/${encodeURIComponent(mediaId)}`,
    {
      headers: {
        Accept: "*/*",
        "x-api-key": resolved.apiKey,
        ...(resolved.phoneId ? { "x-phone-id": resolved.phoneId } : {}),
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (
    contentType.includes("application/json") ||
    contentType.includes("problem+json")
  ) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    return null;
  }

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType.split(";")[0]?.trim() || "audio/ogg",
  };
}

export async function sendRedlavaTextMessage(
  params: {
    toPhone: string;
    body: string;
  },
  credentials?: RedlavaCredentials | null,
) {
  return sendRedlavaWhatsAppMessage(
    {
      toPhone: params.toPhone,
      message: {
        type: "text",
        text: { body: params.body.slice(0, 1000) },
      },
    },
    credentials,
  );
}

/** Meta Cloud API template object (RedLava `/whatsapp/meta/sendMessage` expects this inside `message`). */
export type RedlavaWhatsAppTemplatePayload = {
  name: string;
  language: { code: string };
  components?: Array<Record<string, unknown>>;
};

/**
 * Send an approved WhatsApp template via RedLava's Meta proxy (`type: "template"`).
 * Same shape as RedLava UI → Template tab → send.
 */
export async function sendRedlavaTemplateMessage(
  params: {
    toPhone: string;
    template: RedlavaWhatsAppTemplatePayload;
  },
  credentials?: RedlavaCredentials | null,
): Promise<WhatsAppSendResult> {
  return sendRedlavaWhatsAppMessage(
    {
      toPhone: params.toPhone,
      message: {
        type: "template",
        template: params.template,
      },
    },
    credentials,
  );
}

export async function sendRedlavaWhatsAppMessage(
  params: {
    toPhone: string;
    message: Record<string, unknown>;
  },
  credentials?: RedlavaCredentials | null,
): Promise<WhatsAppSendResult> {
  const resolved = resolveRedlavaCredentials(credentials);
  if (!resolved?.apiKey) {
    return { sent: false, reason: "not_configured" };
  }

  const to = normalizeWhatsAppPhone(params.toPhone);
  if (!to) {
    return { sent: false, reason: "invalid_phone" };
  }

  const message = { ...params.message };
  let templateLanguageCode: string | undefined;
  if (message.type === "template" && message.template) {
    const normalized = enforceRedlavaTemplateLanguage(
      message.template as RedlavaWhatsAppTemplatePayload,
    );
    message.template = normalized;
    templateLanguageCode = normalized.language.code;
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": resolved.apiKey,
  };
  if (resolved.phoneId) {
    headers["x-phone-id"] = resolved.phoneId;
  }

  const response = await fetch(redlavaSendUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      to,
      message,
    }),
  });

  const raw = await response.text();
  const messageType =
    typeof message.type === "string" ? message.type : undefined;
  return parseWhatsAppSendResponse(response, raw, {
    messageType,
    templateLanguageCode,
  });
}
