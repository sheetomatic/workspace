import type { SessionUser } from "@/lib/auth";
import type { WorkspaceModule } from "@prisma/client";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";
import { BCI_SUB_MODULES, type BciSubModuleId } from "@/lib/bci/bci-sub-modules";

type AccessUser = Pick<SessionUser, "modules" | "isSuperAdmin" | "organizationSlug"> & {
  enabledBciSubModules?: readonly string[];
};

export function isPlatformAccessAdmin(user: AccessUser) {
  return user.isSuperAdmin && user.organizationSlug === PRIMARY_ORG_SLUG;
}

export function grantedSuiteParts(user: AccessUser, stored = user.enabledBciSubModules, orgAllowed?: unknown) {
  if (!user.modules.includes("FMS")) return [];
  if (isPlatformAccessAdmin(user)) return BCI_SUB_MODULES.map((part) => part.id);
  return BCI_SUB_MODULES.filter((part) => stored?.includes(part.id) &&
    (!Array.isArray(orgAllowed) || orgAllowed.includes(part.id))).map((part) => part.id);
}

export function hasSuitePart(user: AccessUser, id: BciSubModuleId) {
  return grantedSuiteParts(user).includes(id);
}

export function canUseTasks(user: AccessUser) {
  return user.modules.includes("TASKS") || hasSuitePart(user, "taskDelegation");
}

function within(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Shared by navigation, server pages/actions, and authenticated API entrypoints. */
export function canAccessWorkspacePath(user: AccessUser, pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0].replace(/^\/api\//, "/app/");
  if (within(path, "/app/fleet")) return user.modules.includes("FLEET");
  if (within(path, "/app/checklists")) return hasSuitePart(user, "checklists");
  if (within(path, "/app/pc")) return hasSuitePart(user, "pc");
  if (within(path, "/app/em")) return hasSuitePart(user, "em");
  if (within(path, "/app/fms/scores")) return hasSuitePart(user, "mis");
  if (within(path, "/app/fms")) return hasSuitePart(user, "fms");
  if (within(path, "/app/tasks") || within(path, "/app/today")) return canUseTasks(user);
  const routes: [string, WorkspaceModule][] = [
    ["/app/leads", "CRM"], ["/app/hr", "HR"], ["/app/ims", "IMS"],
    ["/app/reports", "REPORTS"], ["/app/approvals", "APPROVALS"],
    ["/app/social", "SOCIAL"], ["/app/my-space/social", "SOCIAL"],
    ["/app/app-builder", "APP_BUILDER"], ["/app/cases", "CASES"],
  ];
  const match = routes.find(([prefix]) => within(path, prefix));
  return !match || user.modules.includes(match[1]);
}
