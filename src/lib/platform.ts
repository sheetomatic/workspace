import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const PRIMARY_ORG_SLUG = "sheetomatic-technologies";

export async function getPrimaryOrganization() {
  return prisma.organization.findFirst({
    where: { isPrimary: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function isPrimaryOrganization(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { isPrimary: true, slug: true },
  });

  return Boolean(organization?.isPrimary || organization?.slug === PRIMARY_ORG_SLUG);
}

export function canManageSuperAdmins(user: SessionUser, organizationSlug: string) {
  return user.isSuperAdmin && organizationSlug === PRIMARY_ORG_SLUG;
}

/** Platform env vars (REDLAVA_*, WHATSAPP_*) apply only to the primary workspace. */
export async function canUsePlatformWhatsAppEnv(organizationId: string) {
  return isPrimaryOrganization(organizationId);
}

/** Reseller wallet and customer phone discovery are platform-operator only. */
export function canViewPlatformResellerData(
  user: Pick<SessionUser, "isSuperAdmin">,
) {
  return user.isSuperAdmin;
}
