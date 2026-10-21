import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { requireCrmSubModule } from "@/lib/crm/crm-access";
import { resolveMemberCrmSubModules } from "@/lib/crm/crm-sub-modules";
import { resolveSessionModules } from "@/lib/dedicated-client-portals";
import { hasMinimumRole } from "@/lib/permissions";

export async function requireLinkedInUser() {
  const user = await requireSession("STAFF", { module: "CRM" });
  await requireCrmSubModule(user, "leads");
  return user;
}

export async function hasLinkedInWorkspaceAccess(organizationId: string, userId: string) {
  const member = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: {
      role: true, deactivatedAt: true, modules: true, enabledCrmSubModules: true,
      user: { select: { isSuperAdmin: true } },
      organization: { select: { slug: true, status: true, allowedModules: true, isPrimary: true } },
    },
  });
  if (!member || member.deactivatedAt || member.organization.status !== "ACTIVE" ||
      !hasMinimumRole(member.role, "STAFF")) return false;
  const modules = resolveSessionModules({
    isSuperAdmin: member.user.isSuperAdmin, role: member.role,
    organizationSlug: member.organization.slug, membershipModules: member.modules,
    orgAllowedModules: member.organization.allowedModules, isPrimary: member.organization.isPrimary,
  });
  return modules.includes("CRM") && resolveMemberCrmSubModules(member.enabledCrmSubModules).includes("leads");
}
