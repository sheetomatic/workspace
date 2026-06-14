"use server";

import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import {
  getMasAccountDashboard,
  getMasPhoneConnectionStatus,
  getMasPhoneQr,
  linkMasPhoneWithOtp,
  sendMasPhoneOtp,
  type MasAccountDashboard,
} from "@/lib/integrations/messageautosender";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

async function requireMasCredentials() {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false as const, error: "Only admins can manage WhatsApp link." };
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
  if (credentials.whatsappProvider !== "messageautosender") {
    return {
      ok: false as const,
      error: "Switch to Web Based API in Settings before linking a phone.",
    };
  }

  if (!credentials.masUsername || !credentials.masPassword || !credentials.masApiKey) {
    return {
      ok: false as const,
      error: "Save username, password, and API key in Settings first.",
    };
  }

  return {
    ok: true as const,
    mas: {
      username: credentials.masUsername,
      password: credentials.masPassword,
      apiKey: credentials.masApiKey,
    },
  };
}

export async function refreshMasWhatsAppStatus() {
  const auth = await requireMasCredentials();
  if (!auth.ok) {
    return auth;
  }

  const result = await getMasPhoneConnectionStatus(auth.mas);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  return { ok: true as const, status: result.status };
}

export async function fetchMasAccountDashboard(): Promise<
  | { ok: true; dashboard: MasAccountDashboard }
  | { ok: false; error: string }
> {
  const auth = await requireMasCredentials();
  if (!auth.ok) {
    return auth;
  }

  return getMasAccountDashboard(auth.mas);
}

export async function fetchMasWhatsAppQr() {
  const auth = await requireMasCredentials();
  if (!auth.ok) {
    return auth;
  }

  const result = await getMasPhoneQr(auth.mas);
  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error ?? result.message ?? "Could not load QR code.",
    };
  }

  return {
    ok: true as const,
    qrImageUrl: result.qrImageUrl,
    message: result.message,
  };
}

export async function sendMasWhatsAppOtp(mobile: string) {
  const auth = await requireMasCredentials();
  if (!auth.ok) {
    return auth;
  }

  return sendMasPhoneOtp({ mobile }, auth.mas);
}

export async function confirmMasWhatsAppOtp(mobile: string, otp: string) {
  const auth = await requireMasCredentials();
  if (!auth.ok) {
    return auth;
  }

  return linkMasPhoneWithOtp({ mobile, otp }, auth.mas);
}

export async function loadMasWhatsAppLinkStatusForSettings() {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return null;
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
  if (
    credentials.whatsappProvider !== "messageautosender" ||
    !credentials.masUsername ||
    !credentials.masPassword ||
    !credentials.masApiKey
  ) {
    return null;
  }

  const result = await getMasPhoneConnectionStatus({
    username: credentials.masUsername,
    password: credentials.masPassword,
    apiKey: credentials.masApiKey,
  });

  return result.ok ? result.status : null;
}

export async function loadMasAccountDashboardForSettings() {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return null;
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
  if (
    credentials.whatsappProvider !== "messageautosender" ||
    !credentials.masUsername ||
    !credentials.masPassword ||
    !credentials.masApiKey
  ) {
    return null;
  }

  const result = await getMasAccountDashboard({
    username: credentials.masUsername,
    password: credentials.masPassword,
    apiKey: credentials.masApiKey,
  });

  return result.ok ? result.dashboard : null;
}
