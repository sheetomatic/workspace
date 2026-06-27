import { prisma } from "@/lib/db";
import {
  isOrgTierEnforced,
  resolveOrgAllowedModules,
} from "@/lib/org-plan-presets";

export type OrganizationPlanContext = {
  plan: import("@prisma/client").OrgPlan;
  allowedModules: import("@prisma/client").WorkspaceModule[];
  maxMembers: number;
  maxFmsTemplates: number;
  tierEnforced: boolean;
  orgAllowedModules: import("@prisma/client").WorkspaceModule[];
  memberCount: number;
  fmsTemplateCount: number;
};

export async function getOrganizationPlanContext(
  organizationId: string,
): Promise<OrganizationPlanContext | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      plan: true,
      allowedModules: true,
      maxMembers: true,
      maxFmsTemplates: true,
      _count: {
        select: {
          memberships: true,
          fmsTemplates: true,
        },
      },
    },
  });

  if (!organization) {
    return null;
  }

  return {
    plan: organization.plan,
    allowedModules: organization.allowedModules,
    maxMembers: organization.maxMembers,
    maxFmsTemplates: organization.maxFmsTemplates,
    tierEnforced: isOrgTierEnforced(organization.allowedModules),
    orgAllowedModules: resolveOrgAllowedModules(organization.allowedModules),
    memberCount: organization._count.memberships,
    fmsTemplateCount: organization._count.fmsTemplates,
  };
}

export function memberLimitMessage(maxMembers: number) {
  return `This workspace allows up to ${maxMembers} members. Contact Sheetomatic to upgrade.`;
}

export function fmsTemplateLimitMessage(maxFmsTemplates: number) {
  return `This workspace allows up to ${maxFmsTemplates} FMS workflows. Archive one or upgrade to add more.`;
}

export function isAtMemberLimit(context: OrganizationPlanContext) {
  if (!context.tierEnforced) {
    return false;
  }
  return context.memberCount >= context.maxMembers;
}

export function isAtFmsTemplateLimit(context: OrganizationPlanContext) {
  if (!context.tierEnforced) {
    return false;
  }
  if (context.maxFmsTemplates <= 0) {
    return true;
  }
  return context.fmsTemplateCount >= context.maxFmsTemplates;
}
