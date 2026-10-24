import "server-only";
import { prisma } from "@/lib/db";
import { bannerConfig, defaultBanners } from "@/lib/marketing-banners";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";

export async function requireBannerAdmin() {
  const user = await requireSession();
  const organizations = await prisma.organization.findMany({ where: { isPrimary: true }, select: {id: true, workspaceAppearance: true}, take: 2 });
  if (organizations.length !== 1) throw Error("A single primary website organization must be configured.");
  const organization = organizations[0];
  if (!user.isSuperAdmin && !(user.organizationId === organization.id && hasMinimumRole(user.role, "ADMIN"))) throw Error("Website administrators only.");
  return organization;
}

export async function publicBanners() {
  try {
    const organizations = await prisma.organization.findMany({ where: { isPrimary: true }, select: {workspaceAppearance: true}, take: 2 });
    return organizations.length === 1 ? bannerConfig(organizations[0].workspaceAppearance).banners : defaultBanners;
  } catch { return defaultBanners; }
}
