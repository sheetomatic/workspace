import type { WorkspaceModule } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileSpreadsheet,
  FlaskConical,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Megaphone,
  Package,
  PenTool,
  PlusCircle,
  Presentation,
  Settings,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Wallet,
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
    label: "Add Task",
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

/** MSME department-wise ops + FMS trackers (Leads → dispatch spine). */
const DEPARTMENT_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    href: "/app/leads",
    label: "Sales",
    icon: ShoppingCart,
    module: "FMS",
    matchPrefix: "/app/leads",
    children: [
      {
        href: "/app/leads",
        label: "All Leads",
        icon: Megaphone,
        module: "FMS",
        matchPrefix: "/app/leads",
      },
      {
        href: "/app/sales-orders",
        label: "Sales Orders",
        icon: ShoppingCart,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/sales-orders",
      },
      {
        href: "/app/fms/fulfillment?flow=leads",
        label: "Leads FMS",
        icon: GitBranch,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/fulfillment",
      },
      {
        href: "/app/fms/fulfillment",
        label: "Sales Order FMS",
        icon: GitBranch,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/fulfillment",
      },
    ],
  },
  {
    href: "/app/leads",
    label: "Marketing",
    icon: TrendingUp,
    module: "FMS",
    matchPrefix: "/app/leads",
    children: [
      {
        href: "/app/leads",
        label: "Lead Pipeline",
        icon: TrendingUp,
        module: "FMS",
        matchPrefix: "/app/leads",
      },
      {
        href: "/app/leads/settings",
        label: "Lead Sources",
        icon: Megaphone,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/leads/settings",
      },
      {
        href: "/app/fms/fulfillment?flow=leads",
        label: "Follow-up FMS",
        icon: GitBranch,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/fulfillment",
      },
    ],
  },
  {
    href: "/app/hr",
    label: "HR & Admin",
    icon: Users,
    module: "HR",
    matchPrefix: "/app/hr",
    children: [
      {
        href: "/app/hr",
        label: "HR Dashboard",
        icon: MapPin,
        module: "HR",
        matchPrefix: "/app/hr",
      },
      {
        href: "/app/hr/employees",
        label: "Employees",
        icon: Users,
        module: "HR",
        matchPrefix: "/app/hr/employees",
      },
      {
        href: "/app/fms/fulfillment?flow=recruitment",
        label: "Recruitment FMS",
        icon: GitBranch,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/fulfillment",
      },
      {
        href: "/app/checklists/hr",
        label: "HR Check List",
        icon: ClipboardCheck,
        module: "TASKS",
        matchPrefix: "/app/checklists/hr",
      },
      {
        href: "/app/tasks/today",
        label: "EA · Today",
        icon: ClipboardList,
        module: "TASKS",
        matchPrefix: "/app/tasks/today",
      },
      {
        href: "/app/approvals",
        label: "Approvals",
        icon: ClipboardCheck,
        module: "APPROVALS",
        minRole: "MANAGER",
        matchPrefix: "/app/approvals",
      },
      {
        href: "/app/team",
        label: "Team",
        icon: Users,
        minRole: "ADMIN",
        allowDepartmentHead: true,
        matchPrefix: "/app/team",
      },
    ],
  },
  {
    href: "/app/sales-orders?status=DISPATCH_PENDING",
    label: "Operations",
    icon: Truck,
    module: "FMS",
    minRole: "MANAGER",
    matchPrefix: "/app/sales-orders",
    children: [
      {
        href: "/app/sales-orders?status=DISPATCH_PENDING",
        label: "Dispatch Queue",
        icon: Truck,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/sales-orders",
      },
      {
        href: "/app/fms/fulfillment?flow=dispatch",
        label: "Dispatch FMS",
        icon: GitBranch,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/fulfillment",
      },
      {
        href: "/app/fms/lines",
        label: "Live Pipelines",
        icon: GitBranch,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/lines",
      },
      {
        href: "/app/fms/ops",
        label: "Ops Monitor",
        icon: LayoutDashboard,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/ops",
      },
    ],
  },
  {
    href: "/app/sales-orders?status=PO_PENDING",
    label: "Purchase",
    icon: ClipboardList,
    module: "FMS",
    minRole: "MANAGER",
    matchPrefix: "/app/sales-orders",
    children: [
      {
        href: "/app/sales-orders?status=PO_PENDING",
        label: "PO Queue",
        icon: ClipboardList,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/sales-orders",
      },
      {
        href: "/app/fms/fulfillment?flow=purchase-order",
        label: "PO FMS",
        icon: GitBranch,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/fulfillment",
      },
    ],
  },
  {
    href: "/app/ims",
    label: "Store",
    icon: Package,
    module: "IMS",
    minRole: "MANAGER",
    matchPrefix: "/app/ims",
    children: [
      {
        href: "/app/ims",
        label: "IMS Dashboard",
        icon: Package,
        module: "IMS",
        minRole: "MANAGER",
        matchPrefix: "/app/ims",
      },
      {
        href: "/app/ims/orders",
        label: "Stock Orders",
        icon: ShoppingCart,
        module: "IMS",
        minRole: "MANAGER",
        matchPrefix: "/app/ims/orders",
      },
      {
        href: "/app/fms/fulfillment?flow=stock-check",
        label: "Stock Check FMS",
        icon: GitBranch,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/fulfillment",
      },
    ],
  },
  {
    href: "/app/fms/setup/business",
    label: "Design",
    icon: PenTool,
    module: "FMS",
    minRole: "MANAGER",
    matchPrefix: "/app/fms/setup",
    addon: true,
    children: [
      {
        href: "/app/fms/setup/business",
        label: "Enable Design FMS",
        icon: PenTool,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/setup/business",
      },
    ],
  },
  {
    href: "/app/fms/setup/business",
    label: "R&D",
    icon: FlaskConical,
    module: "FMS",
    minRole: "MANAGER",
    matchPrefix: "/app/fms/setup",
    addon: true,
    children: [
      {
        href: "/app/fms/setup/business",
        label: "Enable R&D FMS",
        icon: FlaskConical,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/setup/business",
      },
    ],
  },
  {
    href: "/app/em",
    label: "MDO",
    icon: Presentation,
    module: "REPORTS",
    minRole: "MANAGER",
    matchPrefix: "/app/em",
    children: [
      {
        href: "/app/em",
        label: "EM Ready",
        icon: Presentation,
        module: "REPORTS",
        minRole: "MANAGER",
        matchPrefix: "/app/em",
      },
      {
        href: "/app/reports",
        label: "Reports",
        icon: BarChart3,
        module: "REPORTS",
        matchPrefix: "/app/reports",
      },
      {
        href: "/app/fms/scores",
        label: "MIS Scores",
        icon: BarChart3,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/scores",
      },
      {
        href: "/app/fms/performance",
        label: "Performance",
        icon: BarChart3,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/performance",
      },
    ],
  },
  {
    href: "/app/fms/fulfillment?flow=stock-check",
    label: "Production",
    icon: Factory,
    module: "FMS",
    minRole: "MANAGER",
    matchPrefix: "/app/fms/fulfillment",
    addon: true,
    children: [
      {
        href: "/app/fms/fulfillment?flow=stock-check",
        label: "Production FMS",
        icon: GitBranch,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/fulfillment",
      },
      {
        href: "/app/fms/setup/business",
        label: "Enable Production FMS",
        icon: Factory,
        module: "FMS",
        minRole: "MANAGER",
        matchPrefix: "/app/fms/setup/business",
      },
    ],
  },
];

const MODULE_ITEMS: WorkspaceNavItem[] = [...DEPARTMENT_NAV_ITEMS];

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
            label: "Import & Export",
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
      label: "Departments",
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
      id: "my-space",
      label: "My Space",
      items: [
        {
          href: "/app/my-space",
          label: "My Space",
          icon: Wallet,
          minRole: "MANAGER",
          matchPrefix: "/app/my-space",
          children: [
            {
              href: "/app/my-space",
              label: "Overview",
              icon: LayoutDashboard,
              minRole: "MANAGER",
            },
            {
              href: "/app/my-space/expenses",
              label: "Expenses",
              icon: Wallet,
              minRole: "MANAGER",
              matchPrefix: "/app/my-space/expenses",
            },
          ],
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

export function navIsActive(
  pathname: string,
  href: string,
  matchPrefix?: string,
  currentSearch = "",
) {
  const hrefPath = href.split("?")[0] ?? href;
  const hrefQuery = href.includes("?") ? href.split("?")[1] ?? "" : "";
  const base = matchPrefix ?? hrefPath;
  if (base === "/app") {
    return pathname === "/app";
  }
  if (base === "/app/tasks" && pathname.startsWith("/app/tasks/")) {
    return false;
  }
  if (
    hrefPath === "/app/tasks" &&
    base === "/app/tasks" &&
    (pathname === "/app/tasks/today" || pathname === "/app/tasks/all")
  ) {
    return false;
  }
  if (hrefPath === "/app/pc/today" && (matchPrefix ?? hrefPath) === "/app/pc") {
    return pathname === "/app/pc/today";
  }
  if (hrefPath === "/app/checklists" && base === "/app/checklists") {
    return pathname === "/app/checklists";
  }
  if (hrefPath === "/app/my-space" && base === "/app/my-space") {
    return pathname === "/app/my-space";
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

  const pathMatch = pathname === base || pathname.startsWith(`${base}/`);
  if (!pathMatch) {
    return false;
  }

  const currentParams = new URLSearchParams(currentSearch);
  if (!hrefQuery) {
    if (base === "/app/sales-orders" && currentParams.get("status")) {
      return false;
    }
    if (base === "/app/fms/fulfillment" && currentParams.get("flow")) {
      return false;
    }
    return true;
  }

  const expectedParams = new URLSearchParams(hrefQuery);
  for (const [key, value] of expectedParams.entries()) {
    if (currentParams.get(key) !== value) {
      return false;
    }
  }
  return true;
}

export function navGroupHasActiveChild(
  pathname: string,
  item: WorkspaceNavItem,
  currentSearch = "",
): boolean {
  if (!item.children?.length) {
    return false;
  }
  return item.children.some(
    (child) =>
      navIsActive(pathname, child.href, child.matchPrefix, currentSearch) ||
      navGroupHasActiveChild(pathname, child, currentSearch),
  );
}
