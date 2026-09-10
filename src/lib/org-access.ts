import type { OrganizationStatus, Role } from "@prisma/client";
import { isBillingPortalPath } from "@/lib/billing/access";
import { hasMinimumRole } from "@/lib/permissions";
import { isApiPath } from "@/lib/subdomain";

function pathOnly(pathname: string) {
  return pathname.split("?")[0] ?? pathname;
}

export function isOrganizationOperational(status: OrganizationStatus) {
  return status === "ACTIVE";
}

export function isWorkspaceHomePath(pathname: string) {
  const path = pathOnly(pathname);
  return path === "/app" || path === "/app/";
}

export function canUseSuspendedWorkspace(params: {
  status: OrganizationStatus;
  role: Role;
  isSuperAdmin: boolean;
  pathname: string;
}) {
  if (params.isSuperAdmin) {
    return true;
  }
  if (isOrganizationOperational(params.status)) {
    return true;
  }

  const path = pathOnly(params.pathname);
  if (isWorkspaceHomePath(path)) {
    return true;
  }

  return (
    (params.status === "HOLD" || params.status === "INACTIVE") &&
    hasMinimumRole(params.role, "ADMIN") &&
    isBillingPortalPath(path)
  );
}

export function canUseSuspendedWorkspaceApi(params: {
  status: OrganizationStatus;
  role: Role;
  isSuperAdmin: boolean;
  pathname: string;
}) {
  if (params.isSuperAdmin) {
    return true;
  }
  if (isOrganizationOperational(params.status)) {
    return true;
  }
  if (!isApiPath(pathOnly(params.pathname))) {
    return true;
  }
  return false;
}
