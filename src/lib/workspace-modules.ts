import type { Role, WorkspaceModule } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";

export const WORKSPACE_MODULES: WorkspaceModule[] = [
  "CASES",
  "TASKS",
  "HR",
  "APPROVALS",
  "REPORTS",
];

export const WORKSPACE_MODULE_LABELS: Record<WorkspaceModule, string> = {
  CASES: "Cases",
  TASKS: "Tasks",
  HR: "HR (attendance, field, hiring)",
  APPROVALS: "Approvals",
  REPORTS: "Reports & MIS",
};

export const WORKSPACE_MODULE_HREFS: Partial<Record<WorkspaceModule, string>> = {
  CASES: "/app/cases",
  TASKS: "/app/tasks",
  HR: "/app/hr",
  APPROVALS: "/app/approvals",
  REPORTS: "/app/reports",
};

/** Defaults when admin leaves modules empty (legacy rows use migration backfill). */
export function defaultModulesForRole(role: Role): WorkspaceModule[] {
  if (hasMinimumRole(role, "ADMIN")) {
    return [...WORKSPACE_MODULES];
  }
  if (role === "MANAGER") {
    return ["TASKS", "APPROVALS", "REPORTS"];
  }
  return ["TASKS"];
}

export function resolveMemberModules(
  role: Role,
  assigned: WorkspaceModule[] | null | undefined,
): WorkspaceModule[] {
  if (assigned && assigned.length > 0) {
    return [...new Set(assigned)];
  }
  return defaultModulesForRole(role);
}

export function allWorkspaceModules(): WorkspaceModule[] {
  return [...WORKSPACE_MODULES];
}

export function hasWorkspaceModule(
  user: Pick<SessionUser, "modules" | "isSuperAdmin">,
  module: WorkspaceModule,
) {
  if (user.isSuperAdmin) {
    return true;
  }
  return user.modules.includes(module);
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

/** Default landing route after workspace login (Cases first when enabled). */
export function resolveWorkspaceHomeHref(
  user: Pick<SessionUser, "modules" | "isSuperAdmin">,
) {
  for (const module of WORKSPACE_MODULES) {
    if (hasWorkspaceModule(user, module)) {
      const href = WORKSPACE_MODULE_HREFS[module];
      if (href) {
        return href;
      }
    }
  }
  return "/app/tasks";
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
  if (pathname.startsWith("/app/reports")) {
    return "REPORTS";
  }
  if (pathname.startsWith("/app/approvals")) {
    return "APPROVALS";
  }
  if (pathname.startsWith("/app/tasks")) {
    return "TASKS";
  }
  return null;
}
