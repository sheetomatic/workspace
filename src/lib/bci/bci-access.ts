import type { SessionUser } from "@/lib/auth";
import { getWorkspaceMembershipPrefs } from "@/lib/workspace-shell-data";
import { resolveMemberBciSubModules, type BciSubModuleId } from "@/lib/bci/bci-sub-modules";
import { canUseTasks, hasSuitePart } from "@/lib/workspace-access";

export async function memberBciSubModules(user: Pick<SessionUser, "id" | "organizationId">) {
  const prefs = await getWorkspaceMembershipPrefs(user.id, user.organizationId);
  return resolveMemberBciSubModules(prefs?.enabledBciSubModules);
}

export async function memberHasBciSubModule(user: SessionUser, id: BciSubModuleId) {
  return hasSuitePart(user, id);
}

export async function canEnterTasksApp(user: SessionUser) {
  return canUseTasks(user);
}

export async function canEnterChecklists(user: SessionUser) {
  return hasSuitePart(user, "checklists");
}

export async function canEnterPc(user: SessionUser) {
  return hasSuitePart(user, "pc");
}
