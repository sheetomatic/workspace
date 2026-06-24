import type { Role, WorkspaceModule } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";

export const WORKSPACE_MODULES: WorkspaceModule[] = [
  "CASES",
  "TASKS",
  "FMS",
  "HR",
  "IMS",
  "APPROVALS",
  "REPORTS",
];

export const WORKSPACE_MODULE_LABELS: Record<WorkspaceModule, string> = {
  CASES: "Cases",
  TASKS: "Tasks",
  FMS: "FMS",
  HR: "HR (attendance, field, hiring)",
  IMS: "Inventory (IMS)",
  APPROVALS: "Approvals",
  REPORTS: "Reports & MIS",
};

export const WORKSPACE_MODULE_HREFS: Partial<Record<WorkspaceModule, string>> = {
  CASES: "/app/cases",
  TASKS: "/app/tasks",
  FMS: "/app/fms",
  HR: "/app/hr",
  IMS: "/app/ims",
  APPROVALS: "/app/approvals",
  REPORTS: "/app/reports",
};

/** Defaults when admin leaves modules empty (legacy rows use migration backfill). */
export function defaultModulesForRole(role: Role): WorkspaceModule[] {
  if (hasMinimumRole(role, "ADMIN")) {
    return [...WORKSPACE_MODULES];
  }
  if (role === "MANAGER") {
    return ["TASKS", "FMS", "IMS", "APPROVALS", "REPORTS"];
  }
  if (role === "STAFF") {
    return ["TASKS", "FMS"];
  }
  return ["TASKS", "FMS"];
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

/** Default landing: staff → my work, managers → team board / lines. */
export function resolveWorkspaceHomeHref(
  user: Pick<SessionUser, "modules" | "isSuperAdmin" | "role">,
) {
  for (const module of WORKSPACE_MODULES) {
    if (hasWorkspaceModule(user, module)) {
      if (module === "TASKS") {
        return hasMinimumRole(user.role, "MANAGER") || user.role === "VIEWER"
          ? "/app/tasks"
          : "/app/tasks/my-work";
      }
      if (module === "FMS") {
        return hasMinimumRole(user.role, "MANAGER")
          ? "/app/fms/lines"
          : "/app/fms/my-stops";
      }
      const href = WORKSPACE_MODULE_HREFS[module];
      if (href) {
        return href;
      }
    }
  }
  return "/app/tasks/my-work";
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
  if (pathname.startsWith("/app/reports")) {
    return "REPORTS";
  }
  if (pathname.startsWith("/app/approvals")) {
    return "APPROVALS";
  }
  if (pathname.startsWith("/app/tasks")) {
    return "TASKS";
  }
  if (pathname.startsWith("/app/fms")) {
    return "FMS";
  }
  return null;
}
