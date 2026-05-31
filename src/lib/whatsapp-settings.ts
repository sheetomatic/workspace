import { prisma } from "@/lib/db";
import { formatWhatsAppPhone, normalizeWhatsAppPhone } from "@/lib/phone";

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
  const saved = await getWorkspaceWhatsAppSettings(organizationId);

  const businessPhone =
    normalizeWhatsAppPhone(saved?.businessPhone ?? "") ??
    normalizeWhatsAppPhone(process.env.WHATSAPP_FALLBACK_PHONE ?? "") ??
    null;

  const redlavaApiKey =
    saved?.redlavaApiKey?.trim() || process.env.REDLAVA_API_KEY?.trim() || null;
  const redlavaPhoneId =
    saved?.redlavaPhoneId?.trim() || process.env.REDLAVA_PHONE_ID?.trim() || null;
  const metaAccessToken =
    saved?.metaAccessToken?.trim() ||
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() ||
    null;
  const metaWabaId =
    saved?.metaWabaId?.trim() ||
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() ||
    process.env.WHATSAPP_WABA_ID?.trim() ||
    null;
  const metaBusinessId =
    saved?.metaBusinessId?.trim() ||
    process.env.WHATSAPP_BUSINESS_ID?.trim() ||
    null;

  const hasWorkspace =
    Boolean(saved?.redlavaApiKey) ||
    Boolean(saved?.redlavaPhoneId) ||
    Boolean(saved?.metaAccessToken) ||
    Boolean(saved?.metaWabaId) ||
    Boolean(saved?.businessPhone);
  const hasEnv =
    Boolean(process.env.REDLAVA_API_KEY) ||
    Boolean(process.env.WHATSAPP_ACCESS_TOKEN) ||
    Boolean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID);

  return {
    businessPhone,
    redlavaApiKey,
    redlavaPhoneId,
    metaAccessToken,
    metaWabaId,
    metaBusinessId,
    source: hasWorkspace && hasEnv ? "mixed" : hasWorkspace ? "workspace" : "environment",
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
    redlavaPhoneId: saved?.redlavaPhoneId ?? credentials.redlavaPhoneId ?? "",
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
