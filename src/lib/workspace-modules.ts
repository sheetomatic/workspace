import type { Role, WorkspaceModule } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { dedicatedPortalHomePath } from "@/lib/dedicated-client-portals";
import { hasMinimumRole } from "@/lib/permissions";
import { canAccessWorkspacePath, canUseTasks, grantedSuiteParts } from "@/lib/workspace-access";

export const WORKSPACE_MODULES: WorkspaceModule[] = [
  "CASES",
  "TASKS",
  "FMS",
  "CRM",
  "HR",
  "IMS",
  "APPROVALS",
  "REPORTS",
  "SOCIAL",
  "FLEET",
];

/** BCI / platform modules — legal Cases is a dedicated-portal product only (Hingorani). */
export const PLATFORM_WORKSPACE_MODULES: WorkspaceModule[] = WORKSPACE_MODULES.filter(
  (module) => module !== "CASES",
);

export const WORKSPACE_MODULE_LABELS: Record<WorkspaceModule, string> = {
  CASES: "Cases",
  TASKS: "Tasks Management",
  FMS: "Business Systems Suite",
  FLEET: "Fleet",
  CRM: "CRM",
  HR: "HRMS",
  IMS: "IMS / Stock",
  APPROVALS: "Approvals",
  REPORTS: "Reports & MIS",
  APP_BUILDER: "App Builder",
  SOCIAL: "Social",
};

export const WORKSPACE_MODULE_HREFS: Partial<Record<WorkspaceModule, string>> = {
  CASES: "/app/cases",
  TASKS: "/app/tasks",
  FMS: "/app/fms",
  CRM: "/app/leads",
  HR: "/app/hr",
  IMS: "/app/ims",
  APPROVALS: "/app/approvals",
  REPORTS: "/app/reports",
  APP_BUILDER: "/app/app-builder",
  SOCIAL: "/app/social",
  FLEET: "/app/fleet",
};

/** Sidebar/home destination — skip the /app/fms index redirect. */
export function resolveFmsHomeHref(user: Pick<SessionUser, "role">) {
  return hasMinimumRole(user.role, "MANAGER")
    ? "/app/fms/lines"
    : "/app/fms/my-stops";
}

/** Defaults when admin leaves modules empty (legacy rows use migration backfill).
 * HR is included for managers/staff so invites inherit HRMS when the org allows it
 * (clamped by org `allowedModules` / invite form). */
export function defaultModulesForRole(role: Role): WorkspaceModule[] {
  if (hasMinimumRole(role, "ADMIN")) {
    return [...PLATFORM_WORKSPACE_MODULES];
  }
  if (role === "MANAGER") {
    return ["TASKS", "FMS", "CRM", "HR", "IMS", "APPROVALS", "REPORTS"];
  }
  if (role === "STAFF") {
    return ["TASKS", "FMS", "CRM", "HR"];
  }
  return ["TASKS", "FMS", "CRM", "HR"];
}

export function resolveMemberModules(
  _role: Role,
  assigned: WorkspaceModule[] | null | undefined,
): WorkspaceModule[] {
  if (assigned) {
    return [...new Set(assigned)];
  }
  return [];
}

export function allWorkspaceModules(): WorkspaceModule[] {
  return [...WORKSPACE_MODULES];
}

export function platformWorkspaceModules(): WorkspaceModule[] {
  return [...PLATFORM_WORKSPACE_MODULES];
}

export function hasWorkspaceModule(
  user: Pick<SessionUser, "modules" | "isSuperAdmin">,
  module: WorkspaceModule,
) {
  return user.modules.includes(module);
}

/** Check Lists / PC sit in the BCI suite even when Tasks is not on the plan. */
export const BCI_OPS_MODULES: WorkspaceModule[] = ["FMS", "TASKS"];

export function hasBciOpsModule(
  user: Pick<SessionUser, "modules" | "isSuperAdmin">,
) {
  return BCI_OPS_MODULES.some((module) => hasWorkspaceModule(user, module));
}

export function parseModulesFromForm(formData: FormData): WorkspaceModule[] {
  const raw = formData.getAll("modules").map((value) => value.toString());
  return WORKSPACE_MODULES.filter((module) => raw.includes(module));
}

export function modulesFromRoleDefault(role: Role): WorkspaceModule[] {
  return defaultModulesForRole(role);
}

export function formatModuleList(modules: WorkspaceModule[]) {
  return modules.map((module) => WORKSPACE_MODULE_LABELS[module]).join(", ");
}

/** Default landing: staff → my work, managers → team board / lines. */
export function resolveWorkspaceHomeHref(
  user: Pick<SessionUser, "modules" | "isSuperAdmin" | "role" | "organizationSlug" | "enabledBciSubModules">,
) {
  const dedicatedHome = dedicatedPortalHomePath(user.organizationSlug);
  if (dedicatedHome) {
    return dedicatedHome;
  }

  if (grantedSuiteParts(user).length > 0 && hasMinimumRole(user.role, "MANAGER")) return "/app";
  if (canUseTasks(user)) return "/app/today";

  // Platform orgs never land on /app/cases. CASES is dedicated-portal only
  // (Hingorani). Super-admins have every module via hasWorkspaceModule, so
  // iterating WORKSPACE_MODULES would send them to /app/cases and bounce
  // forever with requireLegalCasesSession → /app.
  for (const workspaceModule of PLATFORM_WORKSPACE_MODULES) {
    if (hasWorkspaceModule(user, workspaceModule)) {
      if (workspaceModule === "TASKS") {
        // FMS managers stay on the widget home; task-only users go to Today.
        if (
          hasWorkspaceModule(user, "FMS") &&
          hasMinimumRole(user.role, "MANAGER")
        ) {
          return "/app";
        }
        return "/app/today";
      }
      if (workspaceModule === "FMS") {
        // Managers land on the widget dashboard (business at a glance);
        // staff go straight to their 2-tap step queue.
        if (canAccessWorkspacePath(user, "/app/fms/my-stops")) return "/app/fms/my-stops";
        const part = grantedSuiteParts(user)[0];
        if (part === "checklists") return "/app/checklists";
        if (part === "pc") return "/app/pc/today";
        continue;
      }
      if (workspaceModule === "CRM") {
        return "/app/leads";
      }
      const href = WORKSPACE_MODULE_HREFS[workspaceModule];
      if (href && canAccessWorkspacePath(user, href)) {
        return href;
      }
    }
  }
  return "/app";
}

export function isCasesOnlyWorkspace(
  user: Pick<SessionUser, "modules" | "isSuperAdmin">,
) {
  if (user.isSuperAdmin) {
    return false;
  }
  return user.modules.length === 1 && user.modules[0] === "CASES";
}

export function pathnameRequiresModule(pathname: string): WorkspaceModule | null {
  if (pathname.startsWith("/app/cases")) {
    return "CASES";
  }
  if (pathname.startsWith("/app/hr")) {
    return "HR";
  }
  if (pathname.startsWith("/app/ims")) {
    return "IMS";
  }
  if (pathname.startsWith("/app/leads")) {
    return "CRM";
  }
  if (pathname.startsWith("/app/reports") || pathname.startsWith("/app/em")) {
    return "REPORTS";
  }
  if (pathname.startsWith("/app/approvals")) {
    return "APPROVALS";
  }
  if (
    pathname.startsWith("/app/tasks") ||
    pathname.startsWith("/app/checklists") ||
    pathname.startsWith("/app/today")
  ) {
    return "TASKS";
  }
  if (pathname.startsWith("/app/fms")) {
    return "FMS";
  }
  if (pathname.startsWith("/app/social") || pathname.startsWith("/app/my-space/social")) {
    return "SOCIAL";
  }
  return null;
}
