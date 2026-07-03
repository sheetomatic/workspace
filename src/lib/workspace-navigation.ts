import type { WorkspaceModule } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Megaphone,
  Package,
  PlusCircle,
  Presentation,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { getDedicatedClientPortal, isDedicatedClientPortal } from "@/lib/dedicated-client-portals";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  minRole?: SessionUser["role"];
  module?: WorkspaceModule;
  allowDepartmentHead?: boolean;
  matchPrefix?: string;
  addon?: boolean;
  children?: WorkspaceNavItem[];
};

export type WorkspaceNavSection = {
  id: string;
  label: string;
  items: WorkspaceNavItem[];
};

const ROLE_ORDER = ["VIEWER", "STAFF", "MANAGER", "ADMIN", "OWNER"] as const;

const CHECK_LIST_CHILD_ITEMS: WorkspaceNavItem[] = [
  {
    href: "/app/checklists/accounts",
    label: "Accounts Check List",
    icon: ClipboardCheck,
    module: "TASKS",
    matchPrefix: "/app/checklists/accounts",
  },
  {
    href: "/app/checklists/hr",
    label: "HR Check List",
    icon: Users,
    module: "TASKS",
    matchPrefix: "/app/checklists/hr",
  },
  {
    href: "/app/checklists/maintenance",
    label: "Maintenance Check List (Machine)",
    icon: Wrench,
    module: "TASKS",
    matchPrefix: "/app/checklists/maintenance",
  },
];

const PC_CHILD_ITEMS: WorkspaceNavItem[] = [
  {
    href: "/app/pc/today",
    label: "Today",
    icon: ClipboardCheck,
    module: "TASKS",
    matchPrefix: "/app/pc/today",
  },
  {
    href: "/app/pc/all",
    label: "All",
    icon: ListChecks,
    module: "TASKS",
    minRole: "MANAGER",
    matchPrefix: "/app/pc/all",
  },
];

const EA_CHILD_ITEMS: WorkspaceNavItem[] = [
  {
    href: "/app/tasks/today",
    label: "Today",
    icon: ClipboardList,
    module: "TASKS",
    matchPrefix: "/app/tasks/today",
  },
  {
    href: "/app/tasks/all",
    label: "All",
    icon: ListChecks,
    module: "TASKS",
    matchPrefix: "/app/tasks/all",
  },
];

const BCI_ITEMS: WorkspaceNavItem[] = [
  {
    href: "/app/fms",
    label: "FMS",
    icon: GitBranch,
    module: "FMS",
    matchPrefix: "/app/fms",
  },
  {
    href: "/app/ims",
    label: "IMS",
    icon: Package,
    module: "IMS",
    matchPrefix: "/app/ims",
  },
  {
    href: "/app/checklists",
    label: "Check List",
    icon: CheckSquare,
    module: "TASKS",
    matchPrefix: "/app/checklists",
    children: CHECK_LIST_CHILD_ITEMS,
  },
  {
    href: "/app/tasks/today",
    label: "EA",
    icon: ClipboardList,
    module: "TASKS",
    matchPrefix: "/app/tasks/today",
    children: EA_CHILD_ITEMS,
  },
  {
    href: "/app/pc/today",
    label: "PC",
    icon: ListChecks,
    module: "TASKS",
    matchPrefix: "/app/pc",
    children: PC_CHILD_ITEMS,
  },
  {
    href: "/app/em",
    label: "EM",
    icon: Presentation,
    module: "REPORTS",
    minRole: "MANAGER",
    matchPrefix: "/app/em",
  },
];

const TASK_DELEGATION_ITEMS: WorkspaceNavItem[] = [
  {
    href: "/app/tasks",
    label: "Tasks Management",
    icon: LayoutDashboard,
    module: "TASKS",
    matchPrefix: "/app/tasks",
  },
  {
    href: "/app/tasks/create",
    label: "Add task",
    icon: PlusCircle,
    module: "TASKS",
    minRole: "MANAGER",
    matchPrefix: "/app/tasks/create",
  },
  {
    href: "/app/tasks/scores",
    label: "Reports",
    icon: BarChart3,
    module: "TASKS",
    minRole: "MANAGER",
    matchPrefix: "/app/tasks/scores",
  },
];

const MODULE_ITEMS: WorkspaceNavItem[] = [
  {
    href: "/app/leads",
    label: "Leads",
    icon: Megaphone,
    module: "FMS",
    matchPrefix: "/app/leads",
  },
  {
    href: "/app/hr",
    label: "HR",
    icon: MapPin,
    module: "HR",
    matchPrefix: "/app/hr",
  },
  {
    href: "/app/approvals",
    label: "Approvals",
    icon: ClipboardCheck,
    module: "APPROVALS",
    minRole: "MANAGER",
    matchPrefix: "/app/approvals",
  },
];

export function canAccessWorkspaceNav(user: SessionUser, item: WorkspaceNavItem) {
  if (item.minRole) {
    const roleOk =
      ROLE_ORDER.indexOf(user.role) >= ROLE_ORDER.indexOf(item.minRole);
    if (!roleOk && !(item.allowDepartmentHead && user.isDepartmentHead)) {
      return false;
    }
  }
  if (!item.module) {
    return true;
  }
  return hasWorkspaceModule(user, item.module);
}

function filterNavItem(user: SessionUser, item: WorkspaceNavItem): WorkspaceNavItem | null {
  if (!canAccessWorkspaceNav(user, item)) {
    return null;
  }

  if (item.children?.length) {
    const children = item.children
      .map((child) => filterNavItem(user, child))
      .filter((child): child is WorkspaceNavItem => child !== null);
    if (children.length === 0) {
      return null;
    }
    return { ...item, children };
  }

  return item;
}

export function visibleWorkspaceNavItems(user: SessionUser, items: WorkspaceNavItem[]) {
  return items
    .map((item) => filterNavItem(user, item))
    .filter((item): item is WorkspaceNavItem => item !== null);
}

/** Top-level links for mobile bottom nav — no nested child explosion. */
export function mobileWorkspaceNavItems(items: WorkspaceNavItem[]): WorkspaceNavItem[] {
  return items.map((item) => {
    if (item.children?.length) {
      const firstChild = item.children[0];
      return {
        ...item,
        href: firstChild?.href ?? item.href,
        matchPrefix: item.matchPrefix ?? firstChild?.matchPrefix ?? item.href,
      };
    }
    return item;
  });
}


export function getWorkspaceNavSections(params: {
  user: SessionUser;
  organizationSlug: string;
}): WorkspaceNavSection[] {
  const { user, organizationSlug } = params;

  if (isDedicatedClientPortal(organizationSlug)) {
    const portal = getDedicatedClientPortal(organizationSlug)!;
    const mainLabel = portal.defaultAppearance.productName ?? portal.name;
    return [
      {
        id: portal.slug,
        label: mainLabel,
        items: [
          {
            href: portal.homePath,
            label: "Dashboard",
            icon: Briefcase,
            module: "CASES",
            matchPrefix: "/app/cases",
          },
        ],
      },
      {
        id: "reports",
        label: "Reports",
        items: [
          {
            href: "/app/reports",
            label: "Reports",
            icon: BarChart3,
            module: "REPORTS",
          },
        ],
      },
      {
        id: "settings",
        label: "Settings",
        items: [
          {
            href: "/app/cases/settings",
            label: "Import & export",
            icon: FileSpreadsheet,
            minRole: "MANAGER",
            matchPrefix: "/app/cases/settings",
          },
          {
            href: "/app/settings",
            label: "Settings",
            icon: Settings,
          },
          {
            href: "/app/team",
            label: "Team",
            icon: Users,
            minRole: "ADMIN",
            allowDepartmentHead: true,
          },
        ],
      },
    ];
  }

  const sections: WorkspaceNavSection[] = [
    {
      id: "bci",
      label: "BCI",
      items: BCI_ITEMS,
    },
    {
      id: "task-delegation",
      label: "Task Delegation",
      items: TASK_DELEGATION_ITEMS,
    },
    {
      id: "modules",
      label: "Modules",
      items: MODULE_ITEMS,
    },
  ];

  sections.push(
    {
      id: "reports",
      label: "Reports",
      items: [
        {
          href: "/app/reports",
          label: "Reports",
          icon: BarChart3,
          module: "REPORTS",
        },
      ],
    },
    {
      id: "settings",
      label: "Settings",
      items: [
        {
          href: "/app/settings",
          label: "Settings",
          icon: Settings,
        },
        {
          href: "/app/team",
          label: "Team",
          icon: Users,
          minRole: "ADMIN",
          allowDepartmentHead: true,
        },
      ],
    },
  );

  return sections;
}

export function navIsActive(pathname: string, href: string, matchPrefix?: string) {
  const base = matchPrefix ?? href;
  if (base === "/app") {
    return pathname === "/app";
  }
  if (base === "/app/tasks" && pathname.startsWith("/app/tasks/")) {
    return false;
  }
  if (
    href === "/app/tasks" &&
    base === "/app/tasks" &&
    (pathname === "/app/tasks/today" || pathname === "/app/tasks/all")
  ) {
    return false;
  }
  if (href === "/app/pc/today" && (matchPrefix ?? href) === "/app/pc") {
    return pathname === "/app/pc/today";
  }
  if (href === "/app/checklists" && base === "/app/checklists") {
    return pathname === "/app/checklists";
  }
  if (
    base === "/app/checklists" &&
    pathname.startsWith("/app/checklists/scores")
  ) {
    return false;
  }
  if (
    base === "/app/checklists" &&
    pathname.startsWith("/app/checklists/my-tasks")
  ) {
    return false;
  }
  if (base === "/app/fms" && pathname.startsWith("/app/fms/setup")) {
    return false;
  }
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function navGroupHasActiveChild(
  pathname: string,
  item: WorkspaceNavItem,
): boolean {
  if (!item.children?.length) {
    return false;
  }
  return item.children.some(
    (child) =>
      navIsActive(pathname, child.href, child.matchPrefix) ||
      navGroupHasActiveChild(pathname, child),
  );
}
