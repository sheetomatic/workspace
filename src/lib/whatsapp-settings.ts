import { prisma } from "@/lib/db";
import { formatWhatsAppPhone, normalizeWhatsAppPhone } from "@/lib/phone";
import { canUsePlatformWhatsAppEnv } from "@/lib/platform";

export type WorkspaceWhatsAppCredentials = {
  businessPhone: string | null;
  redlavaApiKey: string | null;
  redlavaPhoneId: string | null;
  metaAccessToken: string | null;
  metaWabaId: string | null;
  metaBusinessId: string | null;
  source: "workspace" | "environment" | "mixed";
};

export type WhatsAppSettingsFormValues = {
  businessPhone: string;
  redlavaApiKey: string;
  redlavaPhoneId: string;
};

export { maskSecret } from "@/lib/whatsapp-settings-form";
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
  const envRedlavaApiKey = usePlatformEnv
    ? process.env.REDLAVA_API_KEY?.trim() || null
    : null;
  const envRedlavaPhoneId = usePlatformEnv
    ? process.env.REDLAVA_PHONE_ID?.trim() || null
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

  const redlavaApiKey = saved?.redlavaApiKey?.trim() || envRedlavaApiKey || null;
  const redlavaPhoneId =
    saved?.redlavaPhoneId?.trim() || envRedlavaPhoneId || null;
  const metaAccessToken =
    saved?.metaAccessToken?.trim() || envMetaAccessToken || null;
  const metaWabaId = saved?.metaWabaId?.trim() || envMetaWabaId || null;
  const metaBusinessId =
    saved?.metaBusinessId?.trim() || envMetaBusinessId || null;

  const hasWorkspace =
    Boolean(saved?.redlavaApiKey) ||
    Boolean(saved?.redlavaPhoneId) ||
    Boolean(saved?.metaAccessToken) ||
    Boolean(saved?.metaWabaId) ||
    Boolean(saved?.businessPhone);
  const hasEnv =
    usePlatformEnv &&
    (Boolean(envRedlavaApiKey) ||
      Boolean(envMetaAccessToken) ||
      Boolean(envMetaWabaId));

  return {
    businessPhone,
    redlavaApiKey,
    redlavaPhoneId,
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
    redlavaApiKey: saved?.redlavaApiKey ?? "",
    redlavaPhoneId: saved?.redlavaPhoneId ?? "",
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
