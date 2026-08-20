import type { WorkspaceModule } from "@prisma/client";
import type { WorkspaceAppearance } from "@/lib/workspace-appearance";
import {
  effectiveMemberModules,
  resolveOrgAllowedModules,
} from "@/lib/org-plan-presets";
import type { Role } from "@prisma/client";
import { platformWorkspaceModules } from "@/lib/workspace-modules";

export type DedicatedPortalKind = "legal" | "tasks";

export type DedicatedClientPortal = {
  slug: string;
  name: string;
  kind: DedicatedPortalKind;
  allowedModules: WorkspaceModule[];
  defaultAppearance: WorkspaceAppearance;
  /** Landing route after sign-in (TOPS-style dedicated product). */
  homePath: string;
};

export const HINGORANI_PORTAL_SLUG = "hingorani";
export const ANMOL_PORTAL_SLUG = "anmol-traders";

const HINGORANI_DEFAULT_APPEARANCE: WorkspaceAppearance = {
  preset: "royal",
  primary: "#4c1d95",
  sidebar: "#1e1033",
  sidebarHover: "#4c1d95",
  background: "#f8f5ff",
  productName: "Hingorani Law Chamber",
  brandName: "MACT Operations",
};

const ANMOL_DEFAULT_APPEARANCE: WorkspaceAppearance = {
  preset: "forest",
  primary: "#0f766e",
  sidebar: "#042f2e",
  sidebarHover: "#0f766e",
  background: "#f0fdfa",
  productName: "Anmol Traders",
  brandName: "Tasks Management",
};

export const DEDICATED_CLIENT_PORTALS: Record<string, DedicatedClientPortal> = {
  [HINGORANI_PORTAL_SLUG]: {
    slug: HINGORANI_PORTAL_SLUG,
    name: "Hingorani Law Firm",
    kind: "legal",
    allowedModules: ["CASES", "REPORTS"],
    defaultAppearance: HINGORANI_DEFAULT_APPEARANCE,
    homePath: "/app/cases",
  },
  [ANMOL_PORTAL_SLUG]: {
    slug: ANMOL_PORTAL_SLUG,
    name: "Anmol Traders",
    kind: "tasks",
    allowedModules: ["TASKS"],
    defaultAppearance: ANMOL_DEFAULT_APPEARANCE,
    homePath: "/app/tasks",
  },
};

export function getDedicatedClientPortal(
  organizationSlug: string | null | undefined,
): DedicatedClientPortal | null {
  if (!organizationSlug) {
    return null;
  }
  return DEDICATED_CLIENT_PORTALS[organizationSlug] ?? null;
}

export function isDedicatedClientPortal(
  organizationSlug: string | null | undefined,
): boolean {
  return Boolean(getDedicatedClientPortal(organizationSlug));
}

export function dedicatedPortalHomePath(organizationSlug: string | null | undefined) {
  return getDedicatedClientPortal(organizationSlug)?.homePath ?? null;
}

export function dedicatedPortalLoginUrl(slug: string) {
  return `https://${slug}.sheetomatic.com/login?org=${encodeURIComponent(slug)}`;
}

export function isLegalCasesOrganization(
  organizationSlug: string | null | undefined,
): boolean {
  return getDedicatedClientPortal(organizationSlug)?.kind === "legal";
}

export function isTasksDedicatedPortal(
  organizationSlug: string | null | undefined,
): boolean {
  return getDedicatedClientPortal(organizationSlug)?.kind === "tasks";
}

/** Module list for session users — clamps super-admins on dedicated client portals. */
export function resolveSessionModules(params: {
  isSuperAdmin: boolean;
  role: Role;
  organizationSlug: string;
  membershipModules?: WorkspaceModule[] | null;
  orgAllowedModules?: WorkspaceModule[] | null;
  isPrimary?: boolean;
}): WorkspaceModule[] {
  const dedicated = getDedicatedClientPortal(params.organizationSlug);
  if (dedicated) {
    if (params.isSuperAdmin || params.role === "OWNER") {
      return [...dedicated.allowedModules];
    }
    return effectiveMemberModules(
      params.role,
      params.membershipModules,
      dedicated.allowedModules,
      { isPrimary: false },
    );
  }

  if (params.isSuperAdmin) {
    if (params.isPrimary) {
      return platformWorkspaceModules();
    }
    return resolveOrgAllowedModules(params.orgAllowedModules, {
      isPrimary: false,
    });
  }

  return effectiveMemberModules(
    params.role,
    params.membershipModules,
    params.orgAllowedModules,
    { isPrimary: params.isPrimary },
  );
}

export function resolveDedicatedOrgAllowedModules(
  organizationSlug: string,
  orgAllowedModules: WorkspaceModule[] | null | undefined,
  options?: { isPrimary?: boolean },
): WorkspaceModule[] {
  const dedicated = getDedicatedClientPortal(organizationSlug);
  if (dedicated) {
    return [...dedicated.allowedModules];
  }
  return resolveOrgAllowedModules(orgAllowedModules, options);
}
