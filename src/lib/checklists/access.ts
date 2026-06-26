import type { SessionUser } from "@/lib/auth";

/** PC templates are configured at org setup (seed / super admin), not by managers in daily use. */
export function canConfigureChecklists(user: Pick<SessionUser, "isSuperAdmin">) {
  return user.isSuperAdmin;
}
