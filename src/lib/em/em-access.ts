import type { SessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { hasSuitePart } from "@/lib/workspace-access";

export function canAccessEmReady(user: SessionUser) {
  return hasMinimumRole(user.role, "MANAGER") && hasSuitePart(user, "em");
}
