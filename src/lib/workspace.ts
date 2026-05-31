import type { Role, WorkspaceLinkType } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { hasMinimumRole, roleRank } from "@/lib/permissions";

export const WORKSPACE_LINK_LABELS: Record<WorkspaceLinkType, string> = {
  GOOGLE_SHEET: "Google Sheet",
  LOOKER_STUDIO: "Looker Studio",
  APPSHEET: "AppSheet",
  WHATSAPP: "WhatsApp",
  GOOGLE_FORM: "Google Form",
  OTHER: "Other",
};

export async function assertOrganizationAccess(
  organizationId: string,
  userId: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (user?.isSuperAdmin) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error("Workspace access denied");
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (membership) {
      return membership;
    }

    return {
      id: "super-admin-access",
      role: "OWNER" as const,
      userId,
      organizationId,
      department: null,
      designation: "Super Admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!membership) {
    throw new Error("Workspace access denied");
  }

  return membership;
}

export async function getWorkspaceSummary(organizationId: string) {
  const [organization, memberCount, linkCount] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    }),
    prisma.membership.count({ where: { organizationId } }),
    prisma.workspaceLink.count({ where: { organizationId } }),
  ]);

  return {
    organization,
    memberCount,
    linkCount,
  };
}

export async function listWorkspaceMembers(organizationId: string) {
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
    orderBy: { createdAt: "asc" },
  });

  const sorted = [...memberships].sort(
    (a, b) => roleRank(b.role) - roleRank(a.role),
  );

  return sorted.map((membership) => ({
    id: membership.id,
    role: membership.role,
    department: membership.department,
    designation: membership.designation,
    attendanceWorkMode: membership.attendanceWorkMode,
    geoFenceRequired: membership.geoFenceRequired,
    faceRequired: membership.faceRequired,
    joinedAt: membership.createdAt,
    user: membership.user,
  }));
}

export async function listWorkspaceLinks(organizationId: string) {
  return prisma.workspaceLink.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function updateWorkspaceProfile(
  user: SessionUser,
  input: { name: string },
) {
  if (!hasMinimumRole(user.role, "ADMIN")) {
    throw new Error("Only Admin or Owner can update workspace settings");
  }

  await assertOrganizationAccess(user.organizationId, user.id);

  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) {
    throw new Error("Organization name must be between 2 and 120 characters");
  }

  return prisma.organization.update({
    where: { id: user.organizationId },
    data: { name },
  });
}

export async function updateWorkspaceGoogleSheet(
  user: SessionUser,
  input: { googleSheetId: string },
) {
  if (!hasMinimumRole(user.role, "ADMIN")) {
    throw new Error("Only Admin or Owner can update Google Sheets settings");
  }

  await assertOrganizationAccess(user.organizationId, user.id);

  const googleSheetId = input.googleSheetId.trim();

  return prisma.organization.update({
    where: { id: user.organizationId },
    data: { googleSheetId: googleSheetId || null },
  });
}

export function canManageTeam(role: Role) {
  return hasMinimumRole(role, "ADMIN");
}
