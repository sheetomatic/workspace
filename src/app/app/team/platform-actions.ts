"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canManageSuperAdmins,
  isPrimaryOrganization,
  PRIMARY_ORG_SLUG,
} from "@/lib/platform";
import type { TeamActionState } from "@/app/app/team/actions";
import {
  listClientWorkspaces,
  manageClientWorkspace,
  provisionClientWorkspace,
  type ManageClientWorkspaceIntent,
  type ProvisionClientWorkspaceResult,
} from "@/lib/workspace-provision";

export type SuperAdminRow = {
  id: string;
  name: string | null;
  email: string;
};

export async function listSuperAdmins(): Promise<SuperAdminRow[]> {
  const user = await getSessionUser();
  if (
    !user?.isSuperAdmin ||
    !(await isPrimaryOrganization(user.organizationId))
  ) {
    return [];
  }

  const admins = await prisma.user.findMany({
    where: { isSuperAdmin: true },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { email: "asc" },
  });

  return admins;
}

export async function grantSuperAdminAccess(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const user = await getSessionUser();
  if (!user || !canManageSuperAdmins(user, user.organizationSlug)) {
    return {
      ok: false,
      message: "Only super admins in Sheetomatic Technologies can grant access.",
    };
  }

  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  if (!email.includes("@")) {
    return { ok: false, message: "Enter a valid email." };
  }

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    return {
      ok: false,
      message: "No user found with that email. Add them to Team first.",
    };
  }

  if (targetUser.isSuperAdmin) {
    return { ok: false, message: "This user is already a super admin." };
  }

  const primaryOrganization = await prisma.organization.findUnique({
    where: { slug: PRIMARY_ORG_SLUG },
  });

  if (!primaryOrganization) {
    return { ok: false, message: "Primary workspace is not configured." };
  }

  await prisma.user.update({
    where: { id: targetUser.id },
    data: { isSuperAdmin: true },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: targetUser.id,
        organizationId: primaryOrganization.id,
      },
    },
    update: {
      role: "OWNER",
      department: "ADMIN",
      designation: "Super Admin",
    },
    create: {
      userId: targetUser.id,
      organizationId: primaryOrganization.id,
      role: "OWNER",
      department: "ADMIN",
      designation: "Super Admin",
    },
  });

  revalidatePath("/app/team");
  return {
    ok: true,
    message: `${email} now has super admin access across all workspaces.`,
  };
}

export type CreateClientWorkspaceState = ProvisionClientWorkspaceResult | {
  ok: false;
  message: string;
};

export type ManageClientWorkspaceState = {
  ok: boolean;
  message: string;
};

export async function listClientWorkspacesForSuperAdmin() {
  const user = await getSessionUser();
  if (!user || !canManageSuperAdmins(user, user.organizationSlug)) {
    return [];
  }
  return listClientWorkspaces(80);
}

export async function createClientWorkspaceAction(
  _prev: CreateClientWorkspaceState,
  formData: FormData,
): Promise<CreateClientWorkspaceState> {
  const user = await getSessionUser();
  if (!user || !canManageSuperAdmins(user, user.organizationSlug)) {
    return {
      ok: false,
      message: "Only super admins in Sheetomatic Technologies can create client workspaces.",
    };
  }

  const result = await provisionClientWorkspace({
    businessName: String(formData.get("businessName") ?? ""),
    ownerName: String(formData.get("ownerName") ?? ""),
    ownerEmail: String(formData.get("ownerEmail") ?? ""),
    ownerPhone: String(formData.get("ownerPhone") ?? ""),
    bundle: String(formData.get("activationBundle") ?? ""),
    invitedByName: user.name ?? user.email,
  });

  if (result.ok) {
    revalidatePath("/app/team");
    revalidatePath("/app/settings");
  }

  return result;
}

const MANAGE_INTENTS = new Set<ManageClientWorkspaceIntent>([
  "activate",
  "hold",
  "deactivate",
  "remove",
]);

export async function manageClientWorkspaceAction(
  _prev: ManageClientWorkspaceState,
  formData: FormData,
): Promise<ManageClientWorkspaceState> {
  const user = await getSessionUser();
  if (!user || !canManageSuperAdmins(user, user.organizationSlug)) {
    return {
      ok: false,
      message: "Only super admins in Sheetomatic Technologies can manage client workspaces.",
    };
  }

  const intent = formData.get("intent")?.toString().trim() ?? "";
  if (!MANAGE_INTENTS.has(intent as ManageClientWorkspaceIntent)) {
    return { ok: false, message: "Choose activate, hold, deactivate, or remove." };
  }

  const result = await manageClientWorkspace({
    workspaceId: String(formData.get("workspaceId") ?? ""),
    intent: intent as ManageClientWorkspaceIntent,
  });

  if (result.ok) {
    revalidatePath("/app/team");
    revalidatePath("/app/settings");
    revalidatePath("/app");
  }

  return result;
}

export async function revokeSuperAdminAccess(
  userId: string,
): Promise<TeamActionState> {
  const user = await getSessionUser();
  if (!user || !canManageSuperAdmins(user, user.organizationSlug)) {
    return {
      ok: false,
      message: "Only super admins in Sheetomatic Technologies can revoke access.",
    };
  }

  if (userId === user.id) {
    return { ok: false, message: "You cannot revoke your own super admin access." };
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser?.isSuperAdmin) {
    return { ok: false, message: "This user is not a super admin." };
  }

  const superAdminCount = await prisma.user.count({
    where: { isSuperAdmin: true },
  });

  if (superAdminCount <= 1) {
    return { ok: false, message: "At least one super admin must remain." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isSuperAdmin: false },
  });

  revalidatePath("/app/team");
  return { ok: true, message: "Super admin access removed." };
}
