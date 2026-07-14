import type { WorkspaceModule } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  CalendarCheck2,
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
import {
  isNavIdVisible,
  type NavPreferenceOption,
  type WorkspaceNavPrefs,
} from "@/lib/workspace-nav-prefs";

export type WorkspaceNavItem = {
  /** Stable id for show/hide prefs (top-level items only). */
  id?: string;
  href: string;
  label: string;
  icon: LucideIcon;
  minRole?: SessionUser["role"];
  module?: WorkspaceModule;
  /** When set, item is hidden unless this HR sub-module is enabled for the org. */
  hrSubModule?: string;
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

const BCI_CHILD_ITEMS: WorkspaceNavItem[] = [
  {
    id: "fms",
    href: "/app/fms",
    label: "FMS",
    icon: GitBranch,
    module: "FMS",
    matchPrefix: "/app/fms",
  },
  {
    id: "checklists",
    href: "/app/checklists",
    label: "Check List",
    icon: CheckSquare,
    module: "TASKS",
    matchPrefix: "/app/checklists",
    children: CHECK_LIST_CHILD_ITEMS,
  },
  {
    id: "ea",
    href: "/app/tasks/today",
    label: "EA",
    icon: ClipboardList,
    module: "TASKS",
    matchPrefix: "/app/tasks/today",
    children: EA_CHILD_ITEMS,
  },
  {
    id: "pc",
    href: "/app/pc/today",
    label: "PC",
    icon: ListChecks,
    module: "TASKS",
    matchPrefix: "/app/pc",
    children: PC_CHILD_ITEMS,
  },
  {
    id: "em",
    href: "/app/em",
    label: "EM",
    icon: Presentation,
    module: "REPORTS",
    minRole: "MANAGER",
    matchPrefix: "/app/em",
  },
];

/** Collapsible BCI suite — children keep focus-pref ids (fms, checklists, ea, …). CRM is a separate SKU. */
const BCI_GROUP: WorkspaceNavItem = {
  href: "/app/fms",
  label: "BCI",
  icon: Briefcase,
  children: BCI_CHILD_ITEMS,
};

/** Sellable CRM — top-level sibling of BCI, not nested under it. */
const CRM_NAV_ITEM: WorkspaceNavItem = {
  id: "leads",
  href: "/app/leads",
  label: "CRM",
  icon: Megaphone,
  module: "CRM",
  matchPrefix: "/app/leads",
};

const HRMS_NAV_ITEM: WorkspaceNavItem = {
  id: "dept-hr",
  href: "/app/hr",
  label: "HRMS",
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
      href: "/app/hr/attendance",
      label: "Attendance",
      icon: ClipboardCheck,
      module: "HR",
      hrSubModule: "attendance",
      matchPrefix: "/app/hr/attendance",
    },
    {
      href: "/app/hr/employees",
      label: "Employees",
      icon: Users,
      module: "HR",
      hrSubModule: "employees",
      matchPrefix: "/app/hr/employees",
    },
    {
      href: "/app/checklists/hr",
      label: "HR Check List",
      icon: ClipboardCheck,
      module: "TASKS",
      matchPrefix: "/app/checklists/hr",
    },
    {
      href: "/app/hr/holidays",
      label: "Holidays",
      icon: MapPin,
      module: "HR",
      hrSubModule: "holidays",
      minRole: "ADMIN",
      matchPrefix: "/app/hr/holidays",
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
};

const IMS_STOCK_NAV_ITEM: WorkspaceNavItem = {
  id: "dept-store",
  href: "/app/ims",
  label: "IMS / Stock",
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
};

const TASK_DELEGATION_ITEMS: WorkspaceNavItem[] = [
  {
    id: "tasks",
    href: "/app/tasks",
    label: "Tasks Management",
    icon: LayoutDashboard,
    module: "TASKS",
    matchPrefix: "/app/tasks",
  },
  {
    id: "tasks-create",
    href: "/app/tasks/create",
    label: "Add Task",
    icon: PlusCircle,
    module: "TASKS",
    minRole: "MANAGER",
    matchPrefix: "/app/tasks/create",
  },
  {
    id: "tasks-scores",
    href: "/app/tasks/scores",
    label: "Reports",
    icon: BarChart3,
    module: "TASKS",
    minRole: "MANAGER",
    matchPrefix: "/app/tasks/scores",
  },
];

/** MSME department-wise ops + FMS trackers (CRM → dispatch spine). */
const DEPARTMENT_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    id: "dept-sales",
    href: "/app/leads",
    label: "Sales",
    icon: ShoppingCart,
    matchPrefix: "/app/leads",
    children: [
      {
        href: "/app/leads",
        label: "CRM",
        icon: Megaphone,
        module: "CRM",
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
    id: "dept-marketing",
    href: "/app/leads",
    label: "Marketing",
    icon: TrendingUp,
    matchPrefix: "/app/leads",
    children: [
      {
        href: "/app/leads",
        label: "CRM Pipeline",
        icon: TrendingUp,
        module: "CRM",
        matchPrefix: "/app/leads",
      },
      {
        href: "/app/leads/settings",
        label: "Lead Sources",
        icon: Megaphone,
        module: "CRM",
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
    id: "dept-ops",
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
    id: "dept-purchase",
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
    id: "dept-design",
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
    id: "dept-rd",
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
    id: "dept-mdo",
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
    id: "dept-production",
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

const SELLABLE_MODULE_ITEMS: WorkspaceNavItem[] = [
  CRM_NAV_ITEM,
  HRMS_NAV_ITEM,
  IMS_STOCK_NAV_ITEM,
];

export function canAccessWorkspaceNav(
  user: SessionUser,
  item: WorkspaceNavItem,
  enabledHrSubModules?: string[] | null,
) {
  if (item.minRole) {
    const roleOk =
      ROLE_ORDER.indexOf(user.role) >= ROLE_ORDER.indexOf(item.minRole);
    if (!roleOk && !(item.allowDepartmentHead && user.isDepartmentHead)) {
      return false;
    }
  }
  if (item.hrSubModule) {
    if (enabledHrSubModules != null && !enabledHrSubModules.includes(item.hrSubModule)) {
      return false;
    }
  }
  if (!item.module) {
    return true;
  }
  return hasWorkspaceModule(user, item.module);
}

function filterNavItem(
  user: SessionUser,
  item: WorkspaceNavItem,
  enabledHrSubModules?: string[] | null,
): WorkspaceNavItem | null {
  if (!canAccessWorkspaceNav(user, item, enabledHrSubModules)) {
    return null;
  }

  if (item.children?.length) {
    const children = item.children
      .map((child) => filterNavItem(user, child, enabledHrSubModules))
      .filter((child): child is WorkspaceNavItem => child !== null);
    if (children.length === 0) {
      return null;
    }
    return { ...item, children };
  }

  return item;
}

export function visibleWorkspaceNavItems(
  user: SessionUser,
  items: WorkspaceNavItem[],
  enabledHrSubModules?: string[] | null,
) {
  return items
    .map((item) => filterNavItem(user, item, enabledHrSubModules))
    .filter((item): item is WorkspaceNavItem => item !== null);
}

/** Prefer these ids in the mobile bottom bar (HRMS before BCI suite leftovers). */
const MOBILE_NAV_PRIORITY_IDS = [
  "dept-hr",
  "tasks",
  "fms",
  "checklists",
  "leads",
  "em",
  "ea",
  "pc",
  "dept-store",
] as const;

const MOBILE_NAV_MAX_ITEMS = 5;

const MOBILE_NAV_SHORT_LABELS: Record<string, string> = {
  "Tasks Management": "Tasks",
  "IMS / Stock": "IMS",
};

function collapseMobileNavItem(item: WorkspaceNavItem): WorkspaceNavItem {
  const label = MOBILE_NAV_SHORT_LABELS[item.label] ?? item.label;
  if (!item.children?.length) {
    return label === item.label ? item : { ...item, label };
  }
  const firstChild = item.children[0];
  return {
    ...item,
    label,
    href: firstChild?.href ?? item.href,
    matchPrefix: item.matchPrefix ?? firstChild?.matchPrefix ?? item.href,
    children: undefined,
  };
}

/**
 * Bottom nav strip: expand the BCI suite into labeled children (never show "BCI"),
 * keep HRMS as HRMS, prioritize HR/tasks/FMS, cap at five touch targets.
 */
export function mobileWorkspaceNavItems(items: WorkspaceNavItem[]): WorkspaceNavItem[] {
  const flattened: WorkspaceNavItem[] = [];

  for (const item of items) {
    // BCI suite has no preference id — expand children so mobile shows FMS / Checklists / etc.
    if (item.children?.length && !item.id) {
      for (const child of item.children) {
        flattened.push(collapseMobileNavItem(child));
      }
      continue;
    }
    flattened.push(collapseMobileNavItem(item));
  }

  const seen = new Set<string>();
  const unique = flattened.filter((item) => {
    const key = item.id ?? item.href;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  const priorityIndex = new Map<string, number>(
    MOBILE_NAV_PRIORITY_IDS.map((id, index) => [id, index]),
  );

  unique.sort((a, b) => {
    const aRank = a.id != null && priorityIndex.has(a.id)
      ? priorityIndex.get(a.id)!
      : MOBILE_NAV_PRIORITY_IDS.length;
    const bRank = b.id != null && priorityIndex.has(b.id)
      ? priorityIndex.get(b.id)!
      : MOBILE_NAV_PRIORITY_IDS.length;
    return aRank - bRank;
  });

  return unique.slice(0, MOBILE_NAV_MAX_ITEMS);
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
            id: "cases-home",
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
            id: "reports",
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
            id: "cases-import",
            href: "/app/cases/settings",
            label: "Import & Export",
            icon: FileSpreadsheet,
            minRole: "MANAGER",
            matchPrefix: "/app/cases/settings",
          },
          {
            id: "settings",
            href: "/app/settings",
            label: "Settings",
            icon: Settings,
          },
          {
            id: "team",
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
      label: "",
      items: [BCI_GROUP],
    },
    {
      id: "sellable",
      label: "",
      items: SELLABLE_MODULE_ITEMS,
    },
    {
      id: "task-delegation",
      label: "Tasks",
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
          id: "reports",
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
          id: "my-space",
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
            {
              href: "/app/my-space/training",
              label: "Training slots",
              icon: CalendarCheck2,
              minRole: "MANAGER",
              matchPrefix: "/app/my-space/training",
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
          id: "settings",
          href: "/app/settings",
          label: "Settings",
          icon: Settings,
        },
        {
          id: "team",
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

export function filterNavItemsByPrefs(
  items: WorkspaceNavItem[],
  prefs: WorkspaceNavPrefs,
): WorkspaceNavItem[] {
  return items
    .map((item) => {
      if (item.children?.length) {
        // Parent with its own focus id (Check List, EA, HRMS, …): gate whole group.
        if (item.id) {
          if (!isNavIdVisible(prefs, item.id)) {
            return null;
          }
          return item;
        }
        // Parent without id (BCI suite): filter preference-bearing children.
        const children = filterNavItemsByPrefs(item.children, prefs);
        if (children.length === 0) {
          return null;
        }
        return { ...item, children };
      }
      if (!isNavIdVisible(prefs, item.id)) {
        return null;
      }
      return item;
    })
    .filter((item): item is WorkspaceNavItem => item !== null);
}

function collectNavPreferenceOptions(
  items: WorkspaceNavItem[],
  section: WorkspaceNavSection,
  options: NavPreferenceOption[],
) {
  const sectionLabel =
    section.id === "bci"
      ? "BCI"
      : section.id === "sellable"
        ? "Modules"
        : section.label || "Workspace";

  for (const item of items) {
    if (item.id) {
      options.push({
        id: item.id,
        label: item.label,
        sectionId: section.id,
        sectionLabel,
      });
      continue;
    }
    if (item.children?.length) {
      collectNavPreferenceOptions(item.children, section, options);
    }
  }
}

/** Top-level customizable options for Settings → Modules (role/module gated). */
export function listNavPreferenceOptions(params: {
  user: SessionUser;
  organizationSlug: string;
}): NavPreferenceOption[] {
  if (isDedicatedClientPortal(params.organizationSlug)) {
    return [];
  }

  const sections = getWorkspaceNavSections(params);
  const options: NavPreferenceOption[] = [];

  for (const section of sections) {
    if (section.id === "settings" || section.id === "reports") {
      continue;
    }
    collectNavPreferenceOptions(
      visibleWorkspaceNavItems(params.user, section.items),
      section,
      options,
    );
  }

  return options;
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
  // HRMS bottom-nav / sidebar parent stays active on HR Check List.
  if (
    (base === "/app/hr" || hrefPath === "/app/hr") &&
    (pathname === "/app/checklists/hr" || pathname.startsWith("/app/checklists/hr/"))
  ) {
    return true;
  }
  // Check List must not steal active from HRMS on the HR Check List route.
  if (
    base === "/app/checklists" &&
    (pathname === "/app/checklists/hr" || pathname.startsWith("/app/checklists/hr/"))
  ) {
    return false;
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
    if (
      pathname.startsWith("/app/checklists/scores") ||
      pathname.startsWith("/app/checklists/my-tasks") ||
      pathname.startsWith("/app/checklists/hr")
    ) {
      return false;
    }
    return (
      pathname === "/app/checklists" || pathname.startsWith("/app/checklists/")
    );
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
