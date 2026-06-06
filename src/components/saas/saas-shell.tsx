"use client";

import {
  BarChart3,
  ClipboardCheck,
  ListTodo,
  LogOut,
  MapPin,
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
    href: "/app/tasks",
    label: "Tasks",
    icon: ListTodo,
    minRole: "VIEWER",
    module: "TASKS",
  },
  { href: "/app/hr", label: "HR", icon: MapPin, minRole: "VIEWER", module: "HR" },
  {
    href: "/app/approvals",
    label: "Approvals",
    icon: ClipboardCheck,
    minRole: "MANAGER",
    module: "APPROVALS",
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
  { href: "/app/settings", label: "Settings", icon: Settings, minRole: "ADMIN" },
];

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

export function SaasShell({
  user,
  organizations,
  children,
}: {
  user: SessionUser;
  organizations: OrganizationOption[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const visibleNav = navItems.filter((item) => canAccessNav(user, item));
  const roleLabel = user.isSuperAdmin ? "Super Admin" : ROLE_LABELS[user.role];

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
        <div className="ws-mobile-shell-profile" title={`${user.name ?? user.email} · ${roleLabel}`}>
          <span className="crm-avatar sm" aria-hidden>
            {userInitials(user)}
          </span>
          <div className="ws-mobile-shell-profile-text">
            <strong>{user.name ?? user.email.split("@")[0]}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>
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
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = navIsActive(pathname, href);
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
        })}
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
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const active = navIsActive(pathname, href);
            return (
              <Link
                key={href}
                className={active ? "saas-nav-link active" : "saas-nav-link"}
                href={href}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="saas-sidebar-footer">
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
        <div className="saas-content">{children}</div>
      </div>
    </div>
  );
}
