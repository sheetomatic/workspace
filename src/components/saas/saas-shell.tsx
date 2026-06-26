"use client";

import {
  BarChart3,
  Briefcase,
  CheckSquare,
  ClipboardCheck,
  GitBranch,
  ListTodo,
  LogOut,
  MapPin,
  Package,
  Presentation,
  Settings,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { WorkspaceModule } from "@prisma/client";
import { OrganizationSwitcher } from "@/components/saas/organization-switcher";
import type { OrganizationOption } from "@/components/saas/organization-switcher";
import type { SessionUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { siteBrand } from "@/app/site-content";

const ROLE_ORDER = ["VIEWER", "STAFF", "MANAGER", "ADMIN", "OWNER"] as const;

type NavItem = {
  href: string;
  label: string;
  icon: typeof ListTodo;
  minRole?: (typeof ROLE_ORDER)[number];
  module?: WorkspaceModule;
  allowDepartmentHead?: boolean;
};

const navItems: NavItem[] = [
  {
    href: "/app/cases",
    label: "Cases",
    icon: Briefcase,
    minRole: "VIEWER",
    module: "CASES",
  },
  {
    href: "/app/tasks",
    label: "EA",
    icon: ListTodo,
    minRole: "VIEWER",
    module: "TASKS",
  },
  {
    href: "/app/checklists",
    label: "PC",
    icon: CheckSquare,
    minRole: "VIEWER",
    module: "TASKS",
  },
  {
    href: "/app/fms",
    label: "FMS",
    icon: GitBranch,
    minRole: "VIEWER",
    module: "FMS",
  },
  { href: "/app/hr", label: "HR", icon: MapPin, minRole: "VIEWER", module: "HR" },
  {
    href: "/app/ims",
    label: "Inventory",
    icon: Package,
    minRole: "VIEWER",
    module: "IMS",
  },
  {
    href: "/app/approvals",
    label: "Approvals",
    icon: ClipboardCheck,
    minRole: "MANAGER",
    module: "APPROVALS",
  },
  {
    href: "/app/em",
    label: "EM Ready",
    icon: Presentation,
    minRole: "MANAGER",
    module: "REPORTS",
  },
  {
    href: "/app/reports",
    label: "Reports",
    icon: BarChart3,
    minRole: "VIEWER",
    module: "REPORTS",
  },
  {
    href: "/app/team",
    label: "Team",
    icon: Users,
    minRole: "ADMIN",
    allowDepartmentHead: true,
  },
  { href: "/app/settings", label: "Settings", icon: Settings, minRole: "VIEWER" },
];

const SETUP_HREFS = new Set(["/app/team", "/app/settings"]);

const appsNavItems = navItems.filter((item) => !SETUP_HREFS.has(item.href));
const setupNavItems = navItems.filter((item) => SETUP_HREFS.has(item.href));

function NavLinks({
  items,
  pathname,
  user,
  variant,
}: {
  items: NavItem[];
  pathname: string;
  user: SessionUser;
  variant: "desktop" | "mobile";
}) {
  const visible = items.filter((item) => canAccessNav(user, item));

  return visible.map(({ href, label, icon: Icon }) => {
    const active = navIsActive(pathname, href);

    if (variant === "mobile") {
      return (
        <Link
          key={href}
          aria-current={active ? "page" : undefined}
          className={active ? "ws-mobile-nav-link active" : "ws-mobile-nav-link"}
          href={href}
        >
          <Icon size={20} strokeWidth={2} />
          <span>{label}</span>
        </Link>
      );
    }

    return (
      <Link
        key={href}
        aria-current={active ? "page" : undefined}
        className={active ? "saas-nav-link active" : "saas-nav-link"}
        href={href}
      >
        <Icon size={18} strokeWidth={2} />
        {label}
      </Link>
    );
  });
}

function canAccessRole(userRole: SessionUser["role"], minRole?: NavItem["minRole"]) {
  if (!minRole) {
    return true;
  }
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole);
}

function canAccessNav(user: SessionUser, item: NavItem) {
  const roleAllowed = canAccessRole(user.role, item.minRole);
  if (!roleAllowed && !(item.allowDepartmentHead && user.isDepartmentHead)) {
    return false;
  }
  if (!item.module) {
    return true;
  }
  return hasWorkspaceModule(user, item.module);
}

function navIsActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

function userInitials(user: SessionUser) {
  return (user.name ?? user.email)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatPlanLabel(plan: string) {
  return plan
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function SaasShell({
  user,
  organizations,
  organizationPlan,
  organizationPlanLabel,
  children,
}: {
  user: SessionUser;
  organizations: OrganizationOption[];
  /** Raw plan enum from Organization.plan */
  organizationPlan?: string | null;
  /** Human label from ORG_PLAN_LABELS (pass from server layout). */
  organizationPlanLabel?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const roleLabel = user.isSuperAdmin ? "Super Admin" : ROLE_LABELS[user.role];
  const showPlanBadge =
    Boolean(organizationPlan) &&
    ROLE_ORDER.indexOf(user.role) >= ROLE_ORDER.indexOf("ADMIN");
  const planLabel =
    organizationPlanLabel ?? (organizationPlan ? formatPlanLabel(organizationPlan) : null);
  const mobileNavItems = [...appsNavItems, ...setupNavItems];

  return (
    <div className="saas-app workspace-app">
      <header className="ws-mobile-shell-header">
        <div className="ws-mobile-shell-brand">
          <span className="logo-mark">
            <Image
              src={siteBrand.logoSrc}
              alt={siteBrand.logoAlt}
              width={28}
              height={28}
            />
          </span>
          <div className="ws-mobile-shell-brand-text">
            <strong>Sheetomatic</strong>
            <span>{user.organizationName}</span>
          </div>
        </div>
        <OrganizationSwitcher
          className="ws-mobile-shell-org-switcher"
          currentSlug={user.organizationSlug}
          organizations={organizations}
        />
        <div className="ws-mobile-shell-actions">
          <button
            aria-label="Sign out"
            className="ws-mobile-shell-signout"
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="ws-mobile-shell-nav" aria-label="Workspace navigation">
        <NavLinks items={mobileNavItems} pathname={pathname} user={user} variant="mobile" />
      </nav>

      <aside className="saas-sidebar ws-shell-desktop">
        <div className="crm-sidebar-head">
          <div className="saas-sidebar-brand">
            <span className="logo-mark">
              <Image
                src={siteBrand.logoSrc}
                alt={siteBrand.logoAlt}
                width={32}
                height={32}
              />
            </span>
            <div>
              <strong>Sheetomatic</strong>
              <span>{user.organizationName}</span>
            </div>
          </div>
        </div>

        <div className="crm-sidebar-profile">
          <span className="crm-avatar" aria-hidden>
            {userInitials(user)}
          </span>
          <div className="crm-sidebar-profile-text">
            <strong title={user.name ?? user.email}>
              {user.name ?? user.email.split("@")[0]}
            </strong>
            <span className="crm-user-role">
              {user.isSuperAdmin ? "Super Admin" : ROLE_LABELS[user.role]}
            </span>
          </div>
        </div>

        <OrganizationSwitcher
          currentSlug={user.organizationSlug}
          organizations={organizations}
        />

        <nav className="saas-nav" aria-label="Workspace">
          <NavLinks items={appsNavItems} pathname={pathname} user={user} variant="desktop" />

          {setupNavItems.some((item) => canAccessNav(user, item)) ? (
            <>
              <p className="saas-nav-section">Setup</p>
              <NavLinks items={setupNavItems} pathname={pathname} user={user} variant="desktop" />
            </>
          ) : null}
        </nav>

        <div className="saas-sidebar-footer">
          {showPlanBadge ? (
            <p className="saas-plan-badge" title={`Workspace plan: ${organizationPlan}`}>
              Plan · {planLabel}
            </p>
          ) : null}
          <p className="crm-sidebar-email" title={user.email}>
            {user.email}
          </p>
          <button
            className="saas-signout"
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="saas-main">
        <div className="saas-content" id="main">
          {children}
        </div>
      </div>
    </div>
  );
}
