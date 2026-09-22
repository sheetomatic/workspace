import type { Role, TaskDepartment } from "@prisma/client";
import { hasMinimumRole } from "@/lib/permissions";
import type { SessionUser } from "@/lib/auth";
import { TASK_DEPARTMENT_LABELS } from "@/lib/tasks";

export type TeamMemberHierarchyRow = {
  id: string;
  role: Role;
  department: TaskDepartment | null;
  designation: string | null;
  isDepartmentHead: boolean;
  reportingManagerId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  reportingManager: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  } | null;
};

export type TeamHierarchyGroup = {
  department: TaskDepartment;
  departmentLabel: string;
  departmentHead: TeamMemberHierarchyRow | null;
  managers: Array<{
    manager: TeamMemberHierarchyRow;
    members: TeamMemberHierarchyRow[];
  }>;
  unassigned: TeamMemberHierarchyRow[];
};

const DEPARTMENT_ORDER: TaskDepartment[] = [
  "ADMIN",
  "OPERATIONS",
  "SALES",
  "ACCOUNTS",
  "GENERAL",
];

export function canManageTeam(user: SessionUser) {
  return user.isSuperAdmin || hasMinimumRole(user.role, "ADMIN");
}

/** Admin and founder always. A manager only when they have people on their team. */
export function canViewTeamPage(
  user: Pick<SessionUser, "role" | "isSuperAdmin">,
  hasTeam: boolean,
) {
  if (user.isSuperAdmin || hasMinimumRole(user.role, "ADMIN")) return true;
  return user.role === "MANAGER" && hasTeam;
}

export function filterMembersForViewer(
  members: TeamMemberHierarchyRow[],
  options: {
    canManage: boolean;
    viewerDepartment: TaskDepartment | null;
  },
) {
  if (options.canManage) {
    return members;
  }

  if (!options.viewerDepartment) {
    return [];
  }

  return members.filter(
    (member) => member.department === options.viewerDepartment,
  );
}

export function buildTeamHierarchy(
  members: TeamMemberHierarchyRow[],
): TeamHierarchyGroup[] {
  const byDepartment = new Map<TaskDepartment, TeamMemberHierarchyRow[]>();

  for (const member of members) {
    const department = member.department ?? "GENERAL";
    const bucket = byDepartment.get(department) ?? [];
    bucket.push(member);
    byDepartment.set(department, bucket);
  }

  const groups: TeamHierarchyGroup[] = [];

  for (const department of DEPARTMENT_ORDER) {
    const deptMembers = byDepartment.get(department);
    if (!deptMembers?.length) {
      continue;
    }

    const departmentHead =
      deptMembers.find((member) => member.isDepartmentHead) ?? null;

    const managerIdsWithReports = new Set<string>();
    for (const member of deptMembers) {
      if (member.reportingManagerId) {
        managerIdsWithReports.add(member.reportingManagerId);
      }
    }

    const managers = deptMembers
      .filter((member) => managerIdsWithReports.has(member.id))
      .sort((a, b) => displayName(a).localeCompare(displayName(b)));

    const managerGroups = managers.map((manager) => ({
      manager,
      members: deptMembers
        .filter((member) => member.reportingManagerId === manager.id)
        .sort((a, b) => displayName(a).localeCompare(displayName(b))),
    }));

    const assignedMemberIds = new Set<string>();
    for (const group of managerGroups) {
      assignedMemberIds.add(group.manager.id);
      for (const member of group.members) {
        assignedMemberIds.add(member.id);
      }
    }

    const unassigned = deptMembers
      .filter((member) => !assignedMemberIds.has(member.id))
      .sort((a, b) => displayName(a).localeCompare(displayName(b)));

    groups.push({
      department,
      departmentLabel: TASK_DEPARTMENT_LABELS[department],
      departmentHead,
      managers: managerGroups,
      unassigned,
    });

    byDepartment.delete(department);
  }

  for (const [department, deptMembers] of byDepartment.entries()) {
    groups.push({
      department,
      departmentLabel: TASK_DEPARTMENT_LABELS[department],
      departmentHead:
        deptMembers.find((member) => member.isDepartmentHead) ?? null,
      managers: [],
      unassigned: deptMembers.sort((a, b) =>
        displayName(a).localeCompare(displayName(b)),
      ),
    });
  }

  return groups;
}

export function displayName(member: TeamMemberHierarchyRow) {
  return member.user.name ?? member.user.email.split("@")[0] ?? "Member";
}
