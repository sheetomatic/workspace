import type { SessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { hasWorkspaceModule } from "@/lib/workspace-modules";

export function canAccessEmReady(user: SessionUser) {
  return hasMinimumRole(user.role, "MANAGER") && hasWorkspaceModule(user, "REPORTS");
}
