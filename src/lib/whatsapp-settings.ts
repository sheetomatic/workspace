import { prisma } from "@/lib/db";
import { formatWhatsAppPhone, normalizeWhatsAppPhone } from "@/lib/phone";
import { canUsePlatformWhatsAppEnv } from "@/lib/platform";
import type { WhatsAppProviderKind } from "@/lib/integrations/whatsapp-provider";

export type WorkspaceWhatsAppCredentials = {
  businessPhone: string | null;
  whatsappProvider: WhatsAppProviderKind;
  redlavaApiKey: string | null;
  redlavaPhoneId: string | null;
  masUsername: string | null;
  masPassword: string | null;
  masApiKey: string | null;
  metaAccessToken: string | null;
  metaWabaId: string | null;
  metaBusinessId: string | null;
  source: "workspace" | "environment" | "mixed";
};

export type WhatsAppSettingsFormValues = {
  businessPhone: string;
  whatsappProvider: WhatsAppProviderKind;
  redlavaApiKey: string;
  redlavaPhoneId: string;
  masUsername: string;
  masPassword: string;
  masApiKey: string;
};

export { maskSecret } from "@/lib/whatsapp-settings-form";

function parseWhatsAppProvider(value: string | null | undefined): WhatsAppProviderKind {
  return value === "MESSAGEAUTOSENDER" || value === "messageautosender"
    ? "messageautosender"
    : "sheetomatic";
}

function platformDefaultProvider(): WhatsAppProviderKind {
  const env = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase();
  return env === "messageautosender" ? "messageautosender" : "sheetomatic";
}

/** Active provider is set server-side (env or existing workspace record), not in the settings UI. */
export function resolveWorkspaceWhatsAppProvider(
  savedProvider: string | null | undefined,
): WhatsAppProviderKind {
  if (savedProvider) {
    return parseWhatsAppProvider(savedProvider);
  }
  return platformDefaultProvider();
}

export async function getWorkspaceWhatsAppSettings(organizationId: string) {
  return prisma.workspaceWhatsAppSettings.findUnique({
    where: { organizationId },
  });
}

export async function resolveWorkspaceWhatsAppCredentials(
  organizationId: string,
): Promise<WorkspaceWhatsAppCredentials> {
  const [saved, usePlatformEnv] = await Promise.all([
    getWorkspaceWhatsAppSettings(organizationId),
    canUsePlatformWhatsAppEnv(organizationId),
  ]);

  const envBusinessPhone = usePlatformEnv
    ? normalizeWhatsAppPhone(process.env.WHATSAPP_FALLBACK_PHONE ?? "")
    : null;
  const envProvider = usePlatformEnv ? platformDefaultProvider() : "sheetomatic";
  const envRedlavaApiKey = usePlatformEnv
    ? process.env.REDLAVA_API_KEY?.trim() || null
    : null;
  const envRedlavaPhoneId = usePlatformEnv
    ? process.env.REDLAVA_PHONE_ID?.trim() || null
    : null;
  const envMasUsername = usePlatformEnv
    ? process.env.MAS_USERNAME?.trim() || null
    : null;
  const envMasPassword = usePlatformEnv
    ? process.env.MAS_PASSWORD?.trim() || null
    : null;
  const envMasApiKey = usePlatformEnv
    ? process.env.MAS_API_KEY?.trim() || null
    : null;
  const envMetaAccessToken = usePlatformEnv
    ? process.env.WHATSAPP_ACCESS_TOKEN?.trim() || null
    : null;
  const envMetaWabaId = usePlatformEnv
    ? process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() ||
      process.env.WHATSAPP_WABA_ID?.trim() ||
      null
    : null;
  const envMetaBusinessId = usePlatformEnv
    ? process.env.WHATSAPP_BUSINESS_ID?.trim() || null
    : null;

  const businessPhone =
    normalizeWhatsAppPhone(saved?.businessPhone ?? "") ?? envBusinessPhone ?? null;

  const whatsappProvider = saved?.whatsappProvider
    ? parseWhatsAppProvider(saved.whatsappProvider)
    : envProvider;

  const redlavaApiKey = saved?.redlavaApiKey?.trim() || envRedlavaApiKey || null;
  const redlavaPhoneId =
    saved?.redlavaPhoneId?.trim() || envRedlavaPhoneId || null;
  const masUsername = saved?.masUsername?.trim() || envMasUsername || null;
  const masPassword = saved?.masPassword?.trim() || envMasPassword || null;
  const masApiKey = saved?.masApiKey?.trim() || envMasApiKey || null;
  const metaAccessToken =
    saved?.metaAccessToken?.trim() || envMetaAccessToken || null;
  const metaWabaId = saved?.metaWabaId?.trim() || envMetaWabaId || null;
  const metaBusinessId =
    saved?.metaBusinessId?.trim() || envMetaBusinessId || null;

  const hasWorkspace =
    Boolean(saved?.redlavaApiKey) ||
    Boolean(saved?.redlavaPhoneId) ||
    Boolean(saved?.masUsername) ||
    Boolean(saved?.masPassword) ||
    Boolean(saved?.masApiKey) ||
    Boolean(saved?.metaAccessToken) ||
    Boolean(saved?.metaWabaId) ||
    Boolean(saved?.businessPhone);
  const hasEnv =
    usePlatformEnv &&
    (Boolean(envRedlavaApiKey) ||
      Boolean(envMetaAccessToken) ||
      Boolean(envMetaWabaId) ||
      Boolean(envMasUsername));

  return {
    businessPhone,
    whatsappProvider,
    redlavaApiKey,
    redlavaPhoneId,
    masUsername,
    masPassword,
    masApiKey,
    metaAccessToken,
    metaWabaId,
    metaBusinessId,
    source: hasWorkspace && hasEnv ? "mixed" : hasWorkspace ? "workspace" : hasEnv ? "environment" : "workspace",
  };
}

export function toWhatsAppSettingsFormValues(
  saved: Awaited<ReturnType<typeof getWorkspaceWhatsAppSettings>>,
  credentials: WorkspaceWhatsAppCredentials,
): WhatsAppSettingsFormValues {
  return {
    businessPhone: saved?.businessPhone
      ? formatWhatsAppPhone(saved.businessPhone) ?? saved.businessPhone
      : credentials.businessPhone
        ? formatWhatsAppPhone(credentials.businessPhone) ?? credentials.businessPhone
        : "",
    whatsappProvider: credentials.whatsappProvider,
    redlavaApiKey: saved?.redlavaApiKey ?? "",
    redlavaPhoneId: saved?.redlavaPhoneId ?? "",
    masUsername: saved?.masUsername ?? credentials.masUsername ?? "",
    masPassword: "",
    masApiKey: "",
  };
}

export async function listWhatsAppMembers(organizationId: string) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return memberships.map((membership) => ({
    membershipId: membership.id,
    userId: membership.user.id,
    name: membership.user.name ?? membership.user.email.split("@")[0],
    email: membership.user.email,
    phone: membership.user.phone,
    phoneFormatted: formatWhatsAppPhone(membership.user.phone),
    role: membership.role,
    department: membership.department,
    designation: membership.designation,
  }));
}
