import type { SessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";

/** PC templates are configured at org setup (seed / super admin), not by managers in daily use. */
export function canConfigureChecklists(user: Pick<SessionUser, "isSuperAdmin">) {
  return user.isSuperAdmin;
}

/** Admin/Owner (and platform super-admins) can edit or delete checklist templates. */
export function canAdminChecklists(
  user: Pick<SessionUser, "role" | "isSuperAdmin">,
) {
  return user.isSuperAdmin || hasMinimumRole(user.role, "ADMIN");
}
