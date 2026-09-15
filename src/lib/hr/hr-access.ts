import "server-only";

import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import {
  resolveMemberHrSubModules,
  type HrSubModuleId,
} from "@/lib/hr/hr-sub-modules";
import { getWorkspaceMembershipPrefs } from "@/lib/workspace-shell-data";

/** Org ∩ member effective HR sub-modules for the signed-in user. */
export async function getEffectiveHrSubModulesForUser(user: {
  id: string;
  organizationId: string;
}) {
  const [settings, membership] = await Promise.all([
    getOrCreateHrSettings(user.organizationId),
    getWorkspaceMembershipPrefs(user.id, user.organizationId),
  ]);
  const effective = resolveMemberHrSubModules(
    settings.enabledHrSubModules,
    membership?.enabledHrSubModules,
  );
  return {
    settings,
    effective,
    allowed: (id: HrSubModuleId) => effective.includes(id),
  };
}
