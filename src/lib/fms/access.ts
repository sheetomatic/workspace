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

export function canSubmitFms(user: SessionUser) {
  return hasMinimumRole(user.role, "STAFF") || user.role === "VIEWER";
}
