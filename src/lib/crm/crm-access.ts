import "server-only";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  firstAllowedCrmHref,
  resolveMemberCrmSubModules,
  type CrmSubModuleId,
} from "@/lib/crm/crm-sub-modules";
import { parseWorkspaceNavPrefs } from "@/lib/workspace-nav-prefs";

/** Effective CRM sub-modules for the signed-in user. */
export async function getEffectiveCrmSubModulesForUser(user: {
  id: string;
  organizationId: string;
}) {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: user.organizationId,
      },
    },
    select: { enabledCrmSubModules: true, workspacePrefs: true },
  });
  const effective = resolveMemberCrmSubModules(
    membership?.enabledCrmSubModules,
  );
  return {
    effective,
    moduleOrder:
      parseWorkspaceNavPrefs(membership?.workspacePrefs).crmModuleOrder ?? [],
    allowed: (id: CrmSubModuleId) => effective.includes(id),
  };
}

/** Redirect when the member cannot open this CRM sub-module. */
export async function requireCrmSubModule(
  user: { id: string; organizationId: string },
  id: CrmSubModuleId,
) {
  const { effective, allowed } = await getEffectiveCrmSubModulesForUser(user);
  if (!allowed(id)) {
    redirect(firstAllowedCrmHref(effective));
  }
  return effective;
}
