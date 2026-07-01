"use server";

import type { OrgPlan, WorkspaceModule } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { isPrimaryOrganization } from "@/lib/platform";
import { requireSession } from "@/lib/require-session";
import {
  clampModulesToOrg,
  isOrgTierEnforced,
} from "@/lib/org-plan-presets";
import {
  BCI_CORE_MODULES,
  parseAddonModulesFromForm,
} from "@/lib/workspace-addons.shared";
import { resolveMemberModules } from "@/lib/workspace-modules";

function inferPlanFromModules(modules: WorkspaceModule[]): OrgPlan {
  const set = new Set(modules);
  if (set.has("CASES") && !set.has("FMS")) {
    return "LEGAL_ADDON";
  }
  if (set.has("TASKS") && !set.has("FMS")) {
    return "TASKS_ADDON";
  }
  if (set.has("HR") || set.has("IMS")) {
    return "BCI_GROWTH";
  }
  if (set.has("TASKS")) {
    return "BCI_STARTER";
  }
  return "BCI_STARTER";
}

async function syncMembershipModules(
  organizationId: string,
  allowedModules: WorkspaceModule[],
) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId },
    select: { id: true, role: true, modules: true },
  });

  for (const membership of memberships) {
    const modules = clampModulesToOrg(
      resolveMemberModules(membership.role, membership.modules),
      allowedModules,
    );
    await prisma.membership.update({
      where: { id: membership.id },
      data: { modules },
    });
  }
}

export async function saveWorkspaceAddons(formData: FormData) {
  const user = await requireSession();
  const canEdit =
    user.isSuperAdmin ||
    (hasMinimumRole(user.role, "OWNER") &&
      (await isPrimaryOrganization(user.organizationId)));
  if (!canEdit) {
    return {
      ok: false,
      error: "Only workspace owners (primary workspace) or super admins can change add-ons.",
    };
  }

  let allowedModules = parseAddonModulesFromForm(formData);
  if (allowedModules.length === 0) {
    allowedModules = [...BCI_CORE_MODULES];
  }

  const plan = inferPlanFromModules(allowedModules);

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      allowedModules,
      plan,
    },
  });

  await syncMembershipModules(user.organizationId, allowedModules);

  ["/app", "/app/settings", "/app/team"].forEach((path) => revalidatePath(path));

  return { ok: true };
}

export async function ensureOrgAddonEntitlements(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { allowedModules: true },
  });
  if (!organization || isOrgTierEnforced(organization.allowedModules)) {
    return;
  }

  const allowedModules = [...BCI_CORE_MODULES];
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      allowedModules,
      plan: "BCI_STARTER",
    },
  });
  await syncMembershipModules(organizationId, allowedModules);
}
