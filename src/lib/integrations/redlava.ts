/**
 * RedLava WhatsApp API (wa.redlava.in)
 * @see https://wa.redlava.in/Integrations/ApiDocumentation
 */

export type RedlavaCredentials = {
  apiKey?: string | null;
  phoneId?: string | null;
};

export const REDLAVA_DEFAULT_SEND_ENDPOINT = "/whatsapp/meta/sendMessage";
export const REDLAVA_DEFAULT_TEMPLATE_LIST_ENDPOINT =
  "/messageTemplate/getTemplates";
export const REDLAVA_DEFAULT_TEMPLATE_SUBMIT_ENDPOINT =
  "/messageTemplate/create";
export const REDLAVA_DEFAULT_TEMPLATE_SYNC_ENDPOINT =
  "/whatsapp/syncTemplatesFromMeta";

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    return null;
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
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
  const apiKey = input?.apiKey?.trim() || process.env.REDLAVA_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    phoneId: input?.phoneId?.trim() || process.env.REDLAVA_PHONE_ID?.trim() || null,
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

export async function sendRedlavaWhatsAppMessage(
  params: {
    toPhone: string;
    message: Record<string, unknown>;
  },
  credentials?: RedlavaCredentials | null,
) {
  const resolved = resolveRedlavaCredentials(credentials);
  if (!resolved?.apiKey) {
    return { sent: false, reason: "not_configured" as const };
  }

  const to = normalizePhone(params.toPhone);
  if (!to) {
    return { sent: false, reason: "invalid_phone" as const };
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
      message: params.message,
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    if (response.status === 400 && raw.includes("UNSPECIFIED_PHONE_NUMBER")) {
      return {
        sent: false,
        reason: "phone_id_required" as const,
        detail: raw.slice(0, 300),
      };
    }
    return {
      sent: false,
      reason: "api_error" as const,
      detail: raw.slice(0, 300),
    };
  }

  return { sent: true as const };
}
