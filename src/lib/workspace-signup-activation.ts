import type { WorkspaceModule } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  client50OnboardingPreset,
  organizationEntitlementsData,
} from "@/lib/org-onboarding";
import {
  applyOrganizationEntitlements,
  syncOrganizationPlanRecord,
} from "@/lib/organization-plan";
import {
  clampModulesToOrg,
  modulesForTierRole,
} from "@/lib/org-plan-presets";

const DEFAULT_OWNER_MODULES = [
  "TASKS",
  "APPROVALS",
  "REPORTS",
] satisfies WorkspaceModule[];

async function applyClientOnboardingEntitlements(organizationId: string) {
  const preset = client50OnboardingPreset();
  await applyOrganizationEntitlements(organizationId, {
    ...organizationEntitlementsData(preset),
    status: "ACTIVE",
    activatedAt: new Date(),
  });

  const ownerMemberships = await prisma.membership.findMany({
    where: { organizationId, role: "OWNER" },
    select: { id: true, modules: true },
  });

  for (const membership of ownerMemberships) {
    const modules = clampModulesToOrg(
      membership.modules.length > 0
        ? membership.modules
        : modulesForTierRole(preset.plan, "OWNER"),
      preset.allowedModules,
    );
    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        modules: modules.length > 0 ? modules : [...preset.allowedModules],
      },
    });
  }
}

async function grantOwnerModules(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { allowedModules: true },
  });
  const modules =
    organization?.allowedModules && organization.allowedModules.length > 0
      ? organization.allowedModules
      : ([...DEFAULT_OWNER_MODULES] satisfies WorkspaceModule[]);

  await prisma.membership.updateMany({
    where: { organizationId, role: "OWNER" },
    data: { modules: [...modules] },
  });
}

export async function activatePendingWorkspaceBySlug(workspaceSlug: string) {
  const organization = await prisma.organization.findFirst({
    where: { slug: workspaceSlug, status: "ONBOARDING" },
    select: { id: true, name: true },
  });

  if (!organization) {
    return { ok: false as const, message: "Workspace not found or already active." };
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: { status: "ACTIVE" },
  });
  await applyClientOnboardingEntitlements(organization.id);
  await syncOrganizationPlanRecord(organization.id, { activatedAt: new Date() });
  await grantOwnerModules(organization.id);

  return {
    ok: true as const,
    message: `${organization.name} activated. The owner can sign in now.`,
    organizationName: organization.name,
  };
}
