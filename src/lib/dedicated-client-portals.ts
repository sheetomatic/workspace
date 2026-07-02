import type { WorkspaceModule } from "@prisma/client";
import type { WorkspaceAppearance } from "@/lib/workspace-appearance";
import {
  effectiveMemberModules,
  resolveOrgAllowedModules,
} from "@/lib/org-plan-presets";
import type { Role } from "@prisma/client";
import { allWorkspaceModules } from "@/lib/workspace-modules";

export type DedicatedClientPortal = {
  slug: string;
  name: string;
  allowedModules: WorkspaceModule[];
  defaultAppearance: WorkspaceAppearance;
};

export const HINGORANI_PORTAL_SLUG = "hingorani";

const HINGORANI_DEFAULT_APPEARANCE: WorkspaceAppearance = {
  preset: "royal",
  primary: "#7c3aed",
  sidebar: "#1e1b4b",
  sidebarHover: "#312e81",
  background: "#f5f3ff",
  productName: "Hingorani Law Chamber",
  brandName: "Hingorani",
};

export const DEDICATED_CLIENT_PORTALS: Record<string, DedicatedClientPortal> = {
  [HINGORANI_PORTAL_SLUG]: {
    slug: HINGORANI_PORTAL_SLUG,
    name: "Hingorani Law Firm",
    allowedModules: ["CASES", "REPORTS"],
    defaultAppearance: HINGORANI_DEFAULT_APPEARANCE,
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

export function dedicatedPortalLoginUrl(slug: string) {
  return `https://${slug}.sheetomatic.com/login?org=${encodeURIComponent(slug)}`;
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
    return allWorkspaceModules();
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
