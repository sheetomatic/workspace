import type { Role, WorkspaceModule } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AI_APP_MIN_ROLE } from "@/lib/ai-auth-links";
import { isLegalCasesOrganization } from "@/lib/dedicated-client-portals";
import { canUseSuspendedWorkspace } from "@/lib/org-access";
import { hasMinimumRole } from "@/lib/permissions";
import { getRequestPathname } from "@/lib/tenant-host";
import {
  hasWorkspaceModule,
  resolveWorkspaceHomeHref,
} from "@/lib/workspace-modules";
import { logoutHref } from "@/lib/auth-logout";
import { canAccessWorkspacePath, canUseTasks, hasSuitePart } from "@/lib/workspace-access";
import type { BciSubModuleId } from "@/lib/bci/bci-sub-modules";

export async function requireSession(
  minRole?: Role,
  options?: {
    redirectTo?: string;
    module?: WorkspaceModule;
    anyModules?: WorkspaceModule[];
    suitePart?: BciSubModuleId;
  },
) {
  const user = await getSessionUser();

  if (!user) {
    redirect(logoutHref("/login?error=session"));
  }

  if (minRole && !user.isSuperAdmin && !hasMinimumRole(user.role, minRole)) {
    redirect(options?.redirectTo ?? "/app");
  }

  const pathname = await getRequestPathname();
  if (options?.suitePart && !hasSuitePart(user, options.suitePart)) redirect(options?.redirectTo ?? "/app");
  if (!canAccessWorkspacePath(user, pathname)) redirect(options?.redirectTo ?? "/app");
  const suiteTaskAccess = options?.module === "TASKS" && canUseTasks(user);
  const suiteEmAccess = options?.module === "REPORTS" && pathname.split("?")[0] === "/app/em" && hasSuitePart(user, "em");

  if (options?.anyModules?.length) {
    if (!options.anyModules.some((module) => hasWorkspaceModule(user, module))) {
      redirect(options?.redirectTo ?? "/app");
    }
  } else if (options?.module && !hasWorkspaceModule(user, options.module) && !suiteTaskAccess && !suiteEmAccess) {
    redirect(options?.redirectTo ?? "/app");
  }

  if (
    !canUseSuspendedWorkspace({
      status: user.organizationStatus,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      pathname,
    })
  ) {
    redirect("/app");
  }

  return user;
}

export async function requireAiSession(options?: { redirectTo?: string }) {
  return requireSession(AI_APP_MIN_ROLE, {
    redirectTo: options?.redirectTo ?? "/app",
  });
}

export async function requireLegalCasesSession(
  minRole?: Role,
  options?: { redirectTo?: string },
) {
  const user = await requireSession(minRole, {
    module: "CASES",
    // Avoid /app ↔ /app/cases bounce for platform orgs / super-admins.
    redirectTo: options?.redirectTo ?? "/app/today",
  });
  if (!isLegalCasesOrganization(user.organizationSlug)) {
    redirect(options?.redirectTo ?? resolveWorkspaceHomeHref(user));
  }
  return user;
}
