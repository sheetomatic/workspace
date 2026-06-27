"use server";

import type { WorkspaceModule } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { updateAiReplySettings } from "@/lib/integrations/ai-reply-settings";
import { hasMinimumRole } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import {
  clampModulesToOrg,
  modulesForTierRole,
} from "@/lib/org-plan-presets";
import {
  client50OnboardingPreset,
  organizationEntitlementsData,
} from "@/lib/org-onboarding";

export type WorkspaceStatusActionState = {
  ok: boolean;
  message: string;
};

export type AiSettingsActionState = {
  ok: boolean;
  message: string;
};

const DEFAULT_OWNER_MODULES = [
  "TASKS",
  "APPROVALS",
  "REPORTS",
] satisfies WorkspaceModule[];

async function applyClientOnboardingEntitlements(organizationId: string) {
  const preset = client50OnboardingPreset();
  await prisma.organization.update({
    where: { id: organizationId },
    data: organizationEntitlementsData(preset),
  });

  const ownerMemberships = await prisma.membership.findMany({
    where: { organizationId, role: "OWNER" },
    select: { id: true, modules: true },
  });

  for (const membership of ownerMemberships) {
    const modules = clampModulesToOrg(
      membership.modules.length > 0
        ? membership.modules
        : modulesForTierRole("OWNER", preset.plan),
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

export async function setWorkspaceStatusAction(
  _prev: WorkspaceStatusActionState,
  formData: FormData,
): Promise<WorkspaceStatusActionState> {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin) {
    return { ok: false, message: "Only super admins can change workspace status." };
  }

  const status = formData.get("status")?.toString();
  if (status !== "ACTIVE" && status !== "ONBOARDING") {
    return { ok: false, message: "Invalid status." };
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { status },
  });

  if (status === "ACTIVE") {
    await applyClientOnboardingEntitlements(user.organizationId);
    await grantOwnerModules(user.organizationId);
  }

  revalidatePath("/ai/app/settings");
  revalidatePath("/ai/app");
  revalidatePath("/app");

  return {
    ok: true,
    message:
      status === "ACTIVE"
        ? "Workspace activated. Members can sign in and use the app now."
        : "Workspace set to pending. Members see the activation hold screen.",
  };
}

export async function activateOrganizationAction(
  _prev: WorkspaceStatusActionState,
  formData: FormData,
): Promise<WorkspaceStatusActionState> {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin) {
    return { ok: false, message: "Only super admins can activate workspaces." };
  }

  const workspaceSlug = formData.get("workspaceSlug")?.toString().trim();
  if (!workspaceSlug) {
    return { ok: false, message: "Workspace not found." };
  }

  const organization = await prisma.organization.findFirst({
    where: { slug: workspaceSlug, status: "ONBOARDING" },
    select: { id: true, name: true },
  });

  if (!organization) {
    return { ok: false, message: "Workspace not found or already active." };
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: { status: "ACTIVE" },
  });
  await applyClientOnboardingEntitlements(organization.id);
  await grantOwnerModules(organization.id);

  revalidatePath("/ai/app/settings");
  revalidatePath("/ai/app");
  revalidatePath("/app");

  return {
    ok: true,
    message: `${organization.name} activated. The owner can sign in now.`,
  };
}

export async function saveAiReplySettingsAction(
  _prev: AiSettingsActionState,
  formData: FormData,
): Promise<AiSettingsActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "You must be signed in." };
  }

  if (!hasMinimumRole(user.role, "ADMIN") && !user.isSuperAdmin) {
    return { ok: false, message: "Only admins can change AI reply limits." };
  }

  const dailyLimit = Number(formData.get("dailyLimit")?.toString() ?? "300");
  const enabled = formData.get("enabled") === "on";

  if (!Number.isFinite(dailyLimit) || dailyLimit < 1) {
    return { ok: false, message: "Daily limit must be at least 1." };
  }

  await updateAiReplySettings(user.organizationId, {
    dailyLimit,
    enabled,
  });

  revalidatePath("/ai/app/settings");

  return { ok: true, message: "WhatsApp AI reply limits saved." };
}
