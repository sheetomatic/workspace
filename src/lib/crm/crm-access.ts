import "server-only";

import { redirect } from "next/navigation";
import {
  firstAllowedCrmHref,
  resolveMemberCrmSubModules,
  type CrmSubModuleId,
} from "@/lib/crm/crm-sub-modules";
import { parseWorkspaceNavPrefs } from "@/lib/workspace-nav-prefs";
import { getWorkspaceMembershipPrefs } from "@/lib/workspace-shell-data";

/** Effective CRM sub-modules for the signed-in user. */
export async function getEffectiveCrmSubModulesForUser(user: {
  id: string;
  organizationId: string;
}) {
  const membership = await getWorkspaceMembershipPrefs(
    user.id,
    user.organizationId,
  );
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
