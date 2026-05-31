import type { Role } from "@prisma/client";

const ROLE_RANK: Record<Role, number> = {
  VIEWER: 1,
  STAFF: 2,
  MANAGER: 3,
  ADMIN: 4,
  OWNER: 5,
};

export function roleRank(role: Role) {
  return ROLE_RANK[role];
}

export function hasMinimumRole(userRole: Role, required: Role) {
  return roleRank(userRole) >= roleRank(required);
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Full workspace control, billing, and user management.",
  ADMIN: "Manage users, settings, and all operational modules.",
  MANAGER: "Approvals, reports, and team oversight.",
  STAFF: "Data entry and assigned tasks only.",
  VIEWER: "Read-only dashboards and reports.",
};
