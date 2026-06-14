"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import {
  getMasAccountDashboard,
  getMasPhoneConnectionStatus,
  getMasPhoneQr,
  linkMasPhoneWithOtp,
  sendMasPhoneOtp,
  verifyMasCustomerLogin,
  type MasAccountDashboard,
} from "@/lib/integrations/messageautosender";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";
import { saveWhatsAppSettings } from "@/app/app/whatsapp/actions";

export type MasConnectActionState = {
  ok: boolean;
  message: string;
  qrImageUrl?: string | null;
  connected?: boolean;
};

async function requireMasCredentials() {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false as const, error: "Only admins can manage WhatsApp link." };
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(user.organizationId);

  if (!credentials.masUsername || !credentials.masPassword || !credentials.masApiKey) {
    return {
      ok: false as const,
      error: "Save username, password, and API key on Web Based API first.",
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

export async function connectMasWebAccount(
  _prev: MasConnectActionState,
  formData: FormData,
): Promise<MasConnectActionState> {
  formData.set("whatsappProvider", "messageautosender");

  const saveResult = await saveWhatsAppSettings(
    { ok: false, message: "" },
    formData,
  );
  if (!saveResult.ok) {
    return { ok: false, message: saveResult.message };
  }

  const auth = await requireMasCredentials();
  if (!auth.ok) {
    return { ok: false, message: auth.error };
  }

  const login = await verifyMasCustomerLogin(auth.mas);
  if (!login.ok) {
    return { ok: false, message: login.error };
  }

  revalidatePath("/ai/app/settings");

  if (login.dashboard.connected) {
    return {
      ok: true,
      message: "Logged in. WhatsApp is connected.",
      connected: true,
      qrImageUrl: null,
    };
  }

  if (login.qr.ok && login.qr.qrImageUrl) {
    return {
      ok: true,
      message: "Logged in. Scan the QR code to link WhatsApp.",
      connected: false,
      qrImageUrl: login.qr.qrImageUrl,
    };
  }

  return {
    ok: true,
    message:
      login.qr.error ??
      login.qr.message ??
      "Logged in, but QR is unavailable. Try Open web portal or contact support.",
    connected: false,
    qrImageUrl: null,
  };
}

export async function loginMasWebWithoutSave(credentials: {
  username: string;
  password: string;
  apiKey: string;
}): Promise<MasConnectActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can login." };
  }

  const login = await verifyMasCustomerLogin({
    username: credentials.username.trim(),
    password: credentials.password,
    apiKey: credentials.apiKey.trim(),
  });

  if (!login.ok) {
    return { ok: false, message: login.error };
  }

  if (login.dashboard.connected) {
    return {
      ok: true,
      message: "Login successful. WhatsApp is already connected.",
      connected: true,
      qrImageUrl: null,
    };
  }

  if (login.qr.ok && login.qr.qrImageUrl) {
    return {
      ok: true,
      message: "Login successful. Scan the QR code below.",
      connected: false,
      qrImageUrl: login.qr.qrImageUrl,
    };
  }

  return {
    ok: false,
    message:
      login.qr.error ??
      login.qr.message ??
      "Login failed or QR unavailable. Check credentials or open the web portal.",
  };
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

export async function loadMasWhatsAppQrForSettings() {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return null;
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
  if (
    !credentials.masUsername ||
    !credentials.masPassword ||
    !credentials.masApiKey
  ) {
    return null;
  }

  const result = await getMasPhoneQr({
    username: credentials.masUsername,
    password: credentials.masPassword,
    apiKey: credentials.masApiKey,
  });

  if (!result.ok || !result.qrImageUrl) {
    return { qrImageUrl: null, error: result.error ?? result.message ?? null };
  }

  return { qrImageUrl: result.qrImageUrl, error: null };
}
