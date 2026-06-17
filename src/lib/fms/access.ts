import type { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";

export function canManageFms(role: Role) {
  return hasMinimumRole(role, "ADMIN");
}

export function canApproveFmsFlow(role: Role) {
  return role === "OWNER";
}

export function canSubmitFmsFlow(role: Role) {
  return hasMinimumRole(role, "ADMIN");
}

/** Managers+ can skip, cancel, and reassign pipeline steps. */
export function canControlFmsPipeline(role: Role) {
  return hasMinimumRole(role, "MANAGER");
}

/** Admin+, managers, or the step owner may mark a stop done. */
export function canCompleteFmsStep(
  user: SessionUser,
  stepState: { ownerUserId: string | null },
) {
  if (canManageFms(user.role) || canControlFmsPipeline(user.role)) {
    return true;
  }
  return Boolean(stepState.ownerUserId && stepState.ownerUserId === user.id);
}

/** Staff+ may submit live intake forms (not VIEWER). */
export function canSubmitFmsForm(user: SessionUser) {
  return hasMinimumRole(user.role, "STAFF");
}
