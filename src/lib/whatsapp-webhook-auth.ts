import { createHmac, timingSafeEqual } from "crypto";
import { resolveOrganizationByPhoneNumberId } from "@/lib/whatsapp-bot/resolve-org";
import { normalizeWhatsAppWebhookPayload } from "@/lib/whatsapp-webhook-normalize";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appSecret) {
    return false;
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  const received = signatureHeader.slice(7);

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

function tokensMatch(provided: string | null | undefined) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!verifyToken || !provided?.trim()) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(provided.trim()), Buffer.from(verifyToken));
  } catch {
    return false;
  }
}

/** Sheetomatic WhatsApp callback URL may include ?token= on GET verify; same token on POST. */
export function verifyWebhookIngressToken(request: Request) {
  const url = new URL(request.url);
  const tokenFromQuery = url.searchParams.get("token");
  const tokenFromHeader = request.headers.get("x-webhook-verify-token");
  return tokensMatch(tokenFromQuery ?? tokenFromHeader);
}

function verifyWebhookBearerToken(request: Request) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  const authHeader = request.headers.get("authorization")?.trim();
  if (!verifyToken || !authHeader?.startsWith("Bearer ")) {
    return false;
  }
  return tokensMatch(authHeader.slice("Bearer ".length));
}

function verifyWebhookTokenFromPayload(payload: unknown) {
  if (!isRecord(payload)) {
    return false;
  }

  return (
    tokensMatch(pickString(payload.token)) ||
    tokensMatch(pickString(payload.verify_token)) ||
    tokensMatch(pickString(payload.verifyToken))
  );
}

/** RedLava / Sheetomatic WhatsApp often proxy Meta JSON without x-hub-signature-256. */
export async function verifyKnownWorkspaceMetaWebhook(payload: unknown) {
  const normalized = normalizeWhatsAppWebhookPayload(payload);
  if (!normalized) {
    return false;
  }

  const phoneNumberId =
    normalized.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id?.trim();
  if (!phoneNumberId) {
    return false;
  }

  const org = await resolveOrganizationByPhoneNumberId(phoneNumberId);
  return Boolean(org);
}

export async function verifyWhatsAppWebhookRequest(
  request: Request,
  rawBody: string,
  signatureHeader: string | null,
  payload: unknown,
) {
  if (verifyMetaSignature(rawBody, signatureHeader)) {
    return { ok: true as const };
  }

  if (verifyWebhookIngressToken(request)) {
    return { ok: true as const };
  }

  if (verifyWebhookBearerToken(request)) {
    return { ok: true as const };
  }

  if (verifyWebhookTokenFromPayload(payload)) {
    return { ok: true as const };
  }

  if (await verifyKnownWorkspaceMetaWebhook(payload)) {
    return { ok: true as const };
  }

  const appSecret = process.env.META_APP_SECRET?.trim();
  if (signatureHeader && !appSecret) {
    return {
      ok: false as const,
      reason: "missing_meta_app_secret",
    };
  }

  if (signatureHeader) {
    return { ok: false as const, reason: "invalid_signature" };
  }

  return { ok: false as const, reason: "missing_auth" };
}
