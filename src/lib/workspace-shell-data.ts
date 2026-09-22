import { cache } from "react";
import { prisma } from "@/lib/db";

/** Request-scoped org read for the workspace shell (appearance / plan). */
export const getWorkspaceOrganization = cache(async function getWorkspaceOrganization(
  organizationId: string,
) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      product: true,
      logoUrl: true,
      workspaceAppearance: true,
      updatedAt: true,
    },
  });
});

/** Request-scoped membership prefs shared by /app layout and CRM/HR access. */
export const getWorkspaceMembershipPrefs = cache(async function getWorkspaceMembershipPrefs(
  userId: string,
  organizationId: string,
) {
  return prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    select: {
      workspacePrefs: true,
      enabledHrSubModules: true,
      enabledCrmSubModules: true,
      enabledKitKeys: true,
    },
  });
});
