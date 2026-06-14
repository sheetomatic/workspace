/**
 * Message Auto Sender (MAS) WhatsApp Web automation API.
 * @see https://app.messageautosender.com/swagger-ui/4.1.3/index.html
 */

import { normalizeWhatsAppPhone } from "@/lib/phone";
import {
  parseWhatsAppSendResponse,
  type WhatsAppSendResult,
} from "@/lib/integrations/redlava";

export type MasCredentials = {
  username?: string | null;
  password?: string | null;
  apiKey?: string | null;
  channelId?: number | null;
};

export type MasPhoneConnectionStatus = {
  connected: boolean;
  status: string;
  phoneNumber: string | null;
  message: string | null;
};

export type MasPhoneQrResult = {
  ok: boolean;
  qrImageUrl: string | null;
  qrText: string | null;
  message: string | null;
  raw?: string;
};

type MasChannelStatus =
  | "IMAGE_VISIBLE"
  | "SUCCESS"
  | "USE_HERE"
  | "RETRY"
  | "TRYING_TO_REACH_PHONE"
  | string;

function pickString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function masBaseUrl() {
  return (
    process.env.MAS_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    "https://app.messageautosender.com/api/v1"
  );
}

function masResellerApiKey() {
  return process.env.MAS_RESELLER_API_KEY?.trim() || null;
}

export function resolveMasCredentials(
  input?: MasCredentials | null,
): MasCredentials | null {
  const allowEnvFallback = input == null;
  const username =
    input?.username?.trim() ||
    (allowEnvFallback ? process.env.MAS_USERNAME?.trim() : null);
  const password =
    input?.password?.trim() ||
    (allowEnvFallback ? process.env.MAS_PASSWORD?.trim() : null);
  const apiKey =
    input?.apiKey?.trim() ||
    (allowEnvFallback ? process.env.MAS_API_KEY?.trim() : null);

  if (!username || !password || !apiKey) {
    return null;
  }

  return {
    username,
    password,
    apiKey,
    channelId: input?.channelId ?? null,
  };
}

export function isMasConfigured(credentials?: MasCredentials | null) {
  return Boolean(resolveMasCredentials(credentials));
}

function masUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${masBaseUrl()}${normalized}`;
}

function parseMasBody(raw: string): Record<string, unknown> {
  if (!raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw };
  }
}

function unwrapMasResult(body: Record<string, unknown>) {
  const nested = body.result;
  return nested && typeof nested === "object"
    ? (nested as Record<string, unknown>)
    : body;
}

function masImageToDataUrl(image: string) {
  const trimmed = image.trim();
  if (trimmed.startsWith("data:image")) {
    return trimmed;
  }
  if (trimmed.startsWith("http")) {
    return trimmed;
  }
  return `data:image/png;base64,${trimmed}`;
}

function parseChannelLoginResult(body: Record<string, unknown>) {
  const result = unwrapMasResult(body);
  const channelStatus = (pickString(result.channelStatus) ?? "") as MasChannelStatus;
  const image = pickString(result.image);
  const connected = channelStatus === "SUCCESS";
  const statusMessage =
    pickString(body.message) ??
    pickString(result.message) ??
    (channelStatus === "IMAGE_VISIBLE"
      ? "Scan this QR code with WhatsApp on your phone."
      : channelStatus === "SUCCESS"
        ? "WhatsApp is linked and ready."
        : channelStatus === "TRYING_TO_REACH_PHONE"
          ? "Waiting for your phone - keep WhatsApp open."
          : channelStatus === "USE_HERE"
            ? "Tap Use here on your phone, then refresh."
            : channelStatus === "RETRY"
              ? "Link expired - refresh the QR code."
              : "Checking connection status.");

  return {
    channelStatus,
    image,
    connected,
    statusMessage,
  };
}

function parseMasConnectionStatus(body: Record<string, unknown>): MasPhoneConnectionStatus {
  const parsed = parseChannelLoginResult(body);
  return {
    connected: parsed.connected,
    status: parsed.channelStatus || (parsed.connected ? "connected" : "disconnected"),
    phoneNumber: null,
    message: parsed.statusMessage,
  };
}

function extractQrFromChannelBody(body: Record<string, unknown>, raw: string): MasPhoneQrResult {
  const parsed = parseChannelLoginResult(body);

  if (parsed.image) {
    return {
      ok: true,
      qrImageUrl: masImageToDataUrl(parsed.image),
      qrText: null,
      message: parsed.statusMessage,
      raw,
    };
  }

  if (parsed.channelStatus === "SUCCESS") {
    return {
      ok: false,
      qrImageUrl: null,
      qrText: null,
      message: "WhatsApp is already linked.",
      raw,
    };
  }

  return {
    ok: false,
    qrImageUrl: null,
    qrText: null,
    message: parsed.statusMessage,
    raw,
  };
}

async function masChannelLoginRequest(
  credentials?: MasCredentials | null,
): Promise<
  | { ok: true; status: number; raw: string; body: Record<string, unknown> }
  | { ok: false; error: string; status: number; raw: string }
> {
  const resolved = resolveMasCredentials(credentials);
  if (!resolved?.username) {
    return {
      ok: false,
      error: "Save username, password, and API key first.",
      status: 0,
      raw: "",
    };
  }

  const payload: Record<string, unknown> = {
    customerUsername: resolved.username,
  };
  if (resolved.channelId != null) {
    payload.channelId = resolved.channelId;
  }

  const resellerKey = masResellerApiKey();
  const attempts: Array<{
    label: string;
    init: RequestInit;
  }> = [];

  if (resellerKey) {
    attempts.push({
      label: "reseller-json",
      init: {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-api-key": resellerKey,
        },
        body: JSON.stringify(payload),
      },
    });
  }

  if (resolved.username && resolved.password && resolved.apiKey) {
    const form = new URLSearchParams({
      username: resolved.username,
      password: resolved.password,
      apiKey: resolved.apiKey,
      customerUsername: resolved.username,
    });
    if (resolved.channelId != null) {
      form.set("channelId", String(resolved.channelId));
    }

    attempts.push({
      label: "customer-form",
      init: {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    });

    attempts.push({
      label: "customer-json",
      init: {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: resolved.username,
          password: resolved.password,
          apiKey: resolved.apiKey,
          ...payload,
        }),
      },
    });
  }

  let lastError = "Could not load WhatsApp link status.";
  let lastStatus = 0;
  let lastRaw = "";

  for (const attempt of attempts) {
    const response = await fetch(masUrl("/reseller/customer/channel/status"), attempt.init);
    const raw = await response.text();
    lastStatus = response.status;
    lastRaw = raw;

    if (!response.ok) {
      const parsed = parseMasBody(raw);
      lastError =
        pickString(parsed.message) ??
        (response.status === 403
          ? "QR linking is not enabled for this account. Contact Sheetomatic support."
          : response.status === 401
            ? "Invalid Web Based API credentials."
            : raw.slice(0, 200) || `Request failed (${response.status}).`);
      continue;
    }

    return {
      ok: true,
      status: response.status,
      raw,
      body: parseMasBody(raw),
    };
  }

  if (!resellerKey && lastStatus === 403) {
    lastError =
      "Scan QR needs platform reseller access (MAS_RESELLER_API_KEY). Save credentials and ask Sheetomatic to enable linking.";
  }

  return { ok: false, error: lastError, status: lastStatus, raw: lastRaw };
}

async function masFormRequest(
  endpoint: string,
  fields: Record<string, string>,
  credentials: MasCredentials,
) {
  const resolved = resolveMasCredentials(credentials);
  if (!resolved?.username || !resolved.password || !resolved.apiKey) {
    return {
      ok: false as const,
      status: 0,
      raw: "",
      body: {} as Record<string, unknown>,
      error: "Save username, password, and API key first.",
    };
  }

  const body = new URLSearchParams({
    username: resolved.username,
    password: resolved.password,
    apiKey: resolved.apiKey,
    ...fields,
  });

  const response = await fetch(masUrl(endpoint), {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const raw = await response.text();
  const parsed = parseMasBody(raw);

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      raw,
      body: parsed,
      error:
        (pickString(parsed.message) ?? raw.slice(0, 300)) ||
        `Request failed (${response.status}).`,
    };
  }

  return {
    ok: true as const,
    status: response.status,
    raw,
    body: parsed,
  };
}

function messagePayloadToMasText(message: Record<string, unknown>): string | null {
  const type = typeof message.type === "string" ? message.type : "text";

  if (type === "text") {
    const text = message.text;
    if (text && typeof text === "object" && typeof (text as { body?: unknown }).body === "string") {
      return (text as { body: string }).body;
    }
  }

  if (type === "interactive") {
    const interactive = message.interactive;
    if (interactive && typeof interactive === "object") {
      const body = (interactive as { body?: { text?: string } }).body?.text;
      if (body) {
        return body;
      }
    }
  }

  if (type === "template") {
    const template = message.template;
    if (template && typeof template === "object") {
      const name = (template as { name?: string }).name;
      if (name) {
        return `[Template: ${name}]`;
      }
    }
  }

  return null;
}

export async function getMasPhoneConnectionStatus(
  credentials?: MasCredentials | null,
): Promise<
  | { ok: true; status: MasPhoneConnectionStatus }
  | { ok: false; error: string }
> {
  const result = await masChannelLoginRequest(credentials);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, status: parseMasConnectionStatus(result.body) };
}

export async function getMasPhoneQr(
  credentials?: MasCredentials | null,
): Promise<MasPhoneQrResult & { error?: string }> {
  const result = await masChannelLoginRequest(credentials);
  if (!result.ok) {
    return {
      ok: false,
      qrImageUrl: null,
      qrText: null,
      message: result.error,
      error: result.error,
    };
  }

  const parsed = extractQrFromChannelBody(result.body, result.raw);
  if (parsed.ok) {
    return parsed;
  }

  return {
    ...parsed,
    error: parsed.message ?? "QR unavailable",
  };
}

export async function resetMasPhoneLink(credentials?: MasCredentials | null) {
  const resolved = resolveMasCredentials(credentials);
  if (!resolved?.username) {
    return { ok: false as const, error: "Save credentials first." };
  }

  const payload = {
    customerUsername: resolved.username,
    action: "reset",
    ...(resolved.channelId != null ? { channelId: resolved.channelId } : {}),
  };

  const resellerKey = masResellerApiKey();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (resellerKey) {
    headers["x-api-key"] = resellerKey;
  }

  const response = await fetch(masUrl("/reseller/customer/channel/operation"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  if (!response.ok) {
    return {
      ok: false as const,
      error: raw.slice(0, 200) || `Reset failed (${response.status}).`,
    };
  }

  return { ok: true as const, message: "Link reset. Refresh the QR code." };
}

export async function sendMasPhoneOtp(
  params: { mobile: string },
  credentials?: MasCredentials | null,
) {
  const mobile = normalizeWhatsAppPhone(params.mobile);
  if (!mobile) {
    return { ok: false as const, error: "Enter a valid WhatsApp number." };
  }

  return {
    ok: false as const,
    error:
      "OTP linking is not available on this API. Use Scan QR on the Web Based API tab.",
  };
}

export async function linkMasPhoneWithOtp(
  params: { mobile: string; otp: string },
  credentials?: MasCredentials | null,
) {
  void params;
  void credentials;
  return {
    ok: false as const,
    error:
      "OTP linking is not available on this API. Use Scan QR on the Web Based API tab.",
  };
}

export async function sendMasTextMessage(
  params: { toPhone: string; body: string },
  credentials?: MasCredentials | null,
): Promise<WhatsAppSendResult> {
  const resolved = resolveMasCredentials(credentials);
  if (!resolved) {
    return { sent: false, reason: "not_configured" };
  }

  const to = normalizeWhatsAppPhone(params.toPhone);
  if (!to) {
    return { sent: false, reason: "invalid_phone" };
  }

  const result = await masFormRequest(
    "/message/create",
    {
      receiverMobileNo: to,
      message: params.body.slice(0, 4096),
    },
    resolved,
  );

  if (!result.ok) {
    return {
      sent: false,
      reason: "api_error",
      detail: result.error,
    };
  }

  const trimmed = result.raw.trim();
  if (
    !trimmed ||
    /success|sent|queued|ok/i.test(trimmed) ||
    trimmed.startsWith("{")
  ) {
    const parsed = parseWhatsAppSendResponse(
      new Response(result.raw, { status: result.status }),
      result.raw,
      { messageType: "text" },
    );
    if (parsed.sent) {
      return parsed;
    }
    if (!trimmed || /success|sent|queued|ok/i.test(trimmed)) {
      return { sent: true };
    }
    return parsed;
  }

  return { sent: true };
}

export async function sendMasWhatsAppMessage(
  params: {
    toPhone: string;
    message: Record<string, unknown>;
  },
  credentials?: MasCredentials | null,
): Promise<WhatsAppSendResult> {
  const messageType =
    typeof params.message.type === "string" ? params.message.type : "text";

  if (messageType === "template") {
    const text = messagePayloadToMasText(params.message);
    if (!text) {
      return {
        sent: false,
        reason: "api_error",
        detail: "Templates are not supported on Web Based API. Use Official API instead.",
      };
    }
    return sendMasTextMessage({ toPhone: params.toPhone, body: text }, credentials);
  }

  const text = messagePayloadToMasText(params.message);
  if (!text) {
    return {
      sent: false,
      reason: "api_error",
      detail: "Could not convert message to plain text.",
    };
  }

  return sendMasTextMessage({ toPhone: params.toPhone, body: text }, credentials);
}

/** @deprecated Use getMasPhoneConnectionStatus */
export async function getMasPhoneStatus(credentials?: MasCredentials | null) {
  const result = await getMasPhoneConnectionStatus(credentials);
  if (!result.ok) {
    return result;
  }
  return { ok: true as const, body: result.status as unknown as Record<string, unknown> };
}
