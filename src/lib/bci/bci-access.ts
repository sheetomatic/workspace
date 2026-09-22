import type { SessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { getWorkspaceMembershipPrefs } from "@/lib/workspace-shell-data";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import {
  resolveMemberBciSubModules,
  type BciSubModuleId,
} from "@/lib/bci/bci-sub-modules";

export async function memberBciSubModules(
  user: Pick<SessionUser, "id" | "organizationId">,
) {
  const prefs = await getWorkspaceMembershipPrefs(user.id, user.organizationId);
  return resolveMemberBciSubModules(prefs?.enabledBciSubModules);
}

export async function memberHasBciSubModule(
  user: Pick<SessionUser, "id" | "organizationId">,
  id: BciSubModuleId,
) {
  const granted = await memberBciSubModules(user);
  return granted.includes(id);
}

/** Tasks product, a founder/admin, or a BCI Task Delegation grant. */
export async function canEnterTasksApp(
  user: Pick<SessionUser, "id" | "organizationId" | "role" | "isSuperAdmin" | "modules">,
) {
  if (hasWorkspaceModule(user, "TASKS")) return true;
  if (user.isSuperAdmin || hasMinimumRole(user.role, "ADMIN")) return true;
  return memberHasBciSubModule(user, "taskDelegation");
}

/** Check Lists are BCI. The Tasks module does not open them. */
export async function canEnterChecklists(
  user: Pick<SessionUser, "id" | "organizationId" | "role" | "isSuperAdmin" | "modules">,
) {
  if (hasWorkspaceModule(user, "FMS")) return true;
  if (user.isSuperAdmin || hasMinimumRole(user.role, "ADMIN")) return true;
  return memberHasBciSubModule(user, "checklists");
}

/** PC jobs are BCI. The Tasks module does not open them. */
export async function canEnterPc(
  user: Pick<SessionUser, "id" | "organizationId" | "role" | "isSuperAdmin" | "modules">,
) {
  if (hasWorkspaceModule(user, "FMS")) return true;
  if (user.isSuperAdmin || hasMinimumRole(user.role, "ADMIN")) return true;
  return memberHasBciSubModule(user, "pc");
}
