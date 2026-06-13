/**
 * Message Auto Sender (MAS) WhatsApp Web automation API.
 */

import { normalizeWhatsAppPhone } from "@/lib/phone";
import {
  parseWhatsAppSendResponse,
  type WhatsAppSendResult,
} from "@/lib/integrations/redlava";

export type MasCredentials = {
  username?: string | null;
  password?: string | null;
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

function pickString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function masBaseUrl() {
  return (
    process.env.MAS_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    "https://app.messageautosender.com/api/v1"
  );
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

  if (!username || !password) {
    return null;
  }

  return { username, password };
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

function parseMasConnectionStatus(body: Record<string, unknown>): MasPhoneConnectionStatus {
  const statusRaw = pickString(body.status) ?? pickString(body.phoneStatus) ?? "";
  const status = statusRaw.toLowerCase();
  const connected =
    body.connected === true ||
    body.isConnected === true ||
    body.linked === true ||
    ["connected", "linked", "online", "active", "ready", "success"].includes(status);

  const phoneNumber =
    pickString(body.phoneNumber) ??
    pickString(body.mobileNo) ??
    pickString(body.phone) ??
    pickString(body.linkedNumber) ??
    pickString(body.receiverMobileNo);

  return {
    connected,
    status: statusRaw || (connected ? "connected" : "disconnected"),
    phoneNumber,
    message:
      pickString(body.message) ??
      pickString(body.detail) ??
      (typeof body.raw === "string" ? body.raw.slice(0, 200) : null),
  };
}

function extractQrFromBody(body: Record<string, unknown>, raw: string): MasPhoneQrResult {
  const qrText =
    pickString(body.qr) ??
    pickString(body.qrCode) ??
    pickString(body.qrText) ??
    pickString(body.code);

  const imageCandidate =
    pickString(body.qrImage) ??
    pickString(body.image) ??
    pickString(body.imageUrl) ??
    pickString(body.qrImageUrl) ??
    pickString(body.data);

  let qrImageUrl: string | null = null;
  if (imageCandidate) {
    if (imageCandidate.startsWith("data:image")) {
      qrImageUrl = imageCandidate;
    } else if (imageCandidate.startsWith("http")) {
      qrImageUrl = imageCandidate;
    } else {
      qrImageUrl = `data:image/png;base64,${imageCandidate}`;
    }
  } else if (raw.trim().startsWith("data:image")) {
    qrImageUrl = raw.trim();
  } else if (/^[A-Za-z0-9+/=]{100,}$/.test(raw.trim())) {
    qrImageUrl = `data:image/png;base64,${raw.trim()}`;
  }

  return {
    ok: Boolean(qrImageUrl || qrText),
    qrImageUrl,
    qrText,
    message:
      pickString(body.message) ??
      (qrImageUrl || qrText
        ? "Scan this QR code with WhatsApp on your phone."
        : "QR code not available yet. Try again or use OTP link."),
    raw,
  };
}

async function masAuthorizedRequest(
  endpoint: string,
  init?: {
    method?: string;
    fields?: Record<string, string>;
  },
  credentials?: MasCredentials | null,
) {
  const resolved = resolveMasCredentials(credentials);
  if (!resolved?.username || !resolved.password) {
    return {
      ok: false as const,
      status: 0,
      raw: "",
      body: {} as Record<string, unknown>,
      error: "Save username and password first.",
    };
  }

  const method = init?.method ?? "POST";
  const fields = {
    username: resolved.username,
    password: resolved.password,
    ...(init?.fields ?? {}),
  };

  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, image/*, */*",
    Authorization: `Basic ${Buffer.from(`${resolved.username}:${resolved.password}`).toString("base64")}`,
  };

  let body: string | undefined;
  if (method !== "GET") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(fields).toString();
  }

  const url =
    method === "GET"
      ? `${masUrl(endpoint)}?${new URLSearchParams(fields).toString()}`
      : masUrl(endpoint);

  const response = await fetch(url, { method, headers, body });
  const raw = await response.text();
  const parsed = parseMasBody(raw);

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      raw,
      body: parsed,
      error:
        (pickString(parsed.message) ??
          pickString(parsed.error as string) ??
          raw.slice(0, 300)) ||
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

async function masFormRequest(
  endpoint: string,
  fields: Record<string, string>,
  credentials: MasCredentials,
) {
  const resolved = resolveMasCredentials(credentials);
  if (!resolved?.username || !resolved.password) {
    return {
      ok: false as const,
      status: 0,
      raw: "",
      body: {} as Record<string, unknown>,
      error: "Save username and password first.",
    };
  }

  const body = new URLSearchParams({
    username: resolved.username,
    password: resolved.password,
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
  const result = await masAuthorizedRequest(
    "/phone/status",
    { method: "POST" },
    credentials,
  );

  if (!result.ok) {
    const fallback = await masAuthorizedRequest(
      "/phone/status",
      { method: "GET" },
      credentials,
    );
    if (!fallback.ok) {
      return { ok: false, error: result.error ?? "Could not read phone status." };
    }
    return { ok: true, status: parseMasConnectionStatus(fallback.body) };
  }

  return { ok: true, status: parseMasConnectionStatus(result.body) };
}

export async function getMasPhoneQr(
  credentials?: MasCredentials | null,
): Promise<MasPhoneQrResult & { error?: string }> {
  const attempts = [
    () => masAuthorizedRequest("/phone/qr", { method: "POST" }, credentials),
    () => masAuthorizedRequest("/phone/qr", { method: "GET" }, credentials),
    () => masAuthorizedRequest("/phone/connect", { method: "POST", fields: { mode: "qr" } }, credentials),
  ];

  for (const attempt of attempts) {
    const result = await attempt();
    if (result.ok) {
      const parsed = extractQrFromBody(result.body, result.raw);
      if (parsed.ok) {
        return parsed;
      }
    }
  }

  return {
    ok: false,
    qrImageUrl: null,
    qrText: null,
    message: "Could not load QR code. Try OTP link instead.",
    error: "QR unavailable",
  };
}

export async function sendMasPhoneOtp(
  params: { mobile: string },
  credentials?: MasCredentials | null,
) {
  const mobile = normalizeWhatsAppPhone(params.mobile);
  if (!mobile) {
    return { ok: false as const, error: "Enter a valid WhatsApp number." };
  }

  const otpFieldVariants: Array<Record<string, string>> = [
    { mobileNo: mobile },
    { phone: mobile },
    { receiverMobileNo: mobile },
  ];

  const endpoints = ["/phone/otp", "/whatsapp/otp"];

  for (const endpoint of endpoints) {
    for (const fields of otpFieldVariants) {
      const result = await masAuthorizedRequest(
        endpoint,
        { method: "POST", fields },
        credentials,
      );
      if (result.ok) {
        return {
          ok: true as const,
          message:
            pickString(result.body.message) ??
            "OTP sent. Check WhatsApp on that number and enter the code below.",
        };
      }
    }
  }

  return {
    ok: false as const,
    error: "Could not send OTP. Confirm the number and try again.",
  };
}

export async function linkMasPhoneWithOtp(
  params: { mobile: string; otp: string },
  credentials?: MasCredentials | null,
) {
  const mobile = normalizeWhatsAppPhone(params.mobile);
  const otp = params.otp.trim();
  if (!mobile) {
    return { ok: false as const, error: "Enter a valid WhatsApp number." };
  }
  if (!otp) {
    return { ok: false as const, error: "Enter the OTP code." };
  }

  const linkAttempts: Array<{ endpoint: string; fields: Record<string, string> }> = [
    { endpoint: "/phone/link", fields: { mobileNo: mobile, otp, code: otp } },
    { endpoint: "/phone/connect", fields: { mobileNo: mobile, otp, code: otp } },
    { endpoint: "/whatsapp/link", fields: { mobileNo: mobile, otp, code: otp } },
  ];

  for (const attempt of linkAttempts) {
    const result = await masAuthorizedRequest(
      attempt.endpoint,
      { method: "POST", fields: attempt.fields },
      credentials,
    );
    if (result.ok) {
      const status = parseMasConnectionStatus(result.body);
      if (status.connected) {
        return { ok: true as const, message: "WhatsApp linked successfully.", status };
      }
      return {
        ok: true as const,
        message:
          pickString(result.body.message) ?? "Link request accepted. Checking statusÿ",
        status,
      };
    }
  }

  return {
    ok: false as const,
    error: "Invalid or expired OTP. Request a new code and try again.",
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
        detail: "Templates are not supported on WhatsApp Link. Use WhatsApp API instead.",
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
