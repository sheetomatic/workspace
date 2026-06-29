import type { WorkspaceModule } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  CheckSquare,
  ClipboardCheck,
  GitBranch,
  ListTodo,
  MapPin,
  Package,
  Presentation,
  Settings,
  Settings2,
  Users,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { PMS_SURFACE_HIDDEN } from "@/lib/pms-surface";
import { hasWorkspaceModule } from "@/lib/workspace-modules";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  minRole?: SessionUser["role"];
  module?: WorkspaceModule;
  allowDepartmentHead?: boolean;
  matchPrefix?: string;
  addon?: boolean;
};

export type WorkspaceNavSection = {
  id: string;
  label: string;
  items: WorkspaceNavItem[];
};

const ROLE_ORDER = ["VIEWER", "STAFF", "MANAGER", "ADMIN", "OWNER"] as const;

const BCI_CORE_ITEMS: WorkspaceNavItem[] = [
  {
    href: "/app/fms",
    label: "FMS",
    icon: GitBranch,
    module: "FMS",
    matchPrefix: "/app/fms",
  },
  {
    href: "/app/fms/setup",
    label: "Setup",
    icon: Settings2,
    module: "FMS",
    minRole: "MANAGER",
  },
];

const ADDON_ITEMS: WorkspaceNavItem[] = [
  {
    href: "/app/today",
    label: "Today",
    icon: ListTodo,
    module: "TASKS",
    matchPrefix: "/app/today",
    addon: true,
  },
  {
    href: "/app/ims",
    label: "IMS",
    icon: Package,
    module: "IMS",
    matchPrefix: "/app/ims",
    addon: true,
  },
  {
    href: "/app/checklists/scores",
    label: "PMS",
    icon: ClipboardCheck,
    module: "TASKS",
    matchPrefix: "/app/checklists/scores",
    addon: true,
  },
  {
    href: "/app/checklists/my-tasks",
    label: "Check List",
    icon: CheckSquare,
    module: "TASKS",
    matchPrefix: "/app/checklists",
    addon: true,
  },
  {
    href: "/app/em",
    label: "EM",
    icon: Presentation,
    module: "REPORTS",
    minRole: "MANAGER",
    matchPrefix: "/app/em",
    addon: true,
  },
  {
    href: "/app/hr",
    label: "HR",
    icon: MapPin,
    module: "HR",
    matchPrefix: "/app/hr",
    addon: true,
  },
  {
    href: "/app/approvals",
    label: "Approvals",
    icon: ClipboardCheck,
    module: "APPROVALS",
    minRole: "MANAGER",
    matchPrefix: "/app/approvals",
    addon: true,
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

export function visibleWorkspaceNavItems(user: SessionUser, items: WorkspaceNavItem[]) {
  return items.filter((item) => {
    if (PMS_SURFACE_HIDDEN && item.href === "/app/checklists/scores") {
      return false;
    }
    return canAccessWorkspaceNav(user, item);
  });
}

export function getWorkspaceNavSections(params: {
  user: SessionUser;
  organizationSlug: string;
}): WorkspaceNavSection[] {
  const { user, organizationSlug } = params;
  const isHingorani = organizationSlug === "hingorani";

  const sections: WorkspaceNavSection[] = [
    {
      id: "bci",
      label: "BCI",
      items: BCI_CORE_ITEMS,
    },
    {
      id: "addons",
      label: "Add-ons",
      items: ADDON_ITEMS,
    },
  ];

  if (isHingorani && hasWorkspaceModule(user, "CASES")) {
    sections.push({
      id: "hingorani",
      label: "Hingorani",
      items: [
        {
          href: "/app/cases",
          label: "Hingorani",
          icon: Briefcase,
          module: "CASES",
          matchPrefix: "/app/cases",
          addon: true,
        },
      ],
    });
  }

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
  if (
    base === "/app/checklists" &&
    pathname.startsWith("/app/checklists/scores")
  ) {
    return false;
  }
  if (base === "/app/fms" && pathname.startsWith("/app/fms/setup")) {
    return false;
  }
  return pathname === base || pathname.startsWith(`${base}/`);
}
