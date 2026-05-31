"use client";

import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
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
import { OrganizationSwitcher } from "@/components/saas/organization-switcher";
import type { OrganizationOption } from "@/components/saas/organization-switcher";
import type { SessionUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { siteBrand } from "@/app/site-content";

const ROLE_ORDER = ["VIEWER", "STAFF", "MANAGER", "ADMIN", "OWNER"] as const;

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  minRole?: (typeof ROLE_ORDER)[number];
};

const navItems: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/tasks", label: "Tasks", icon: ListTodo, minRole: "VIEWER" },
  { href: "/app/hr", label: "HR", icon: MapPin, minRole: "VIEWER" },
  { href: "/app/approvals", label: "Approvals", icon: ClipboardCheck, minRole: "MANAGER" },
  { href: "/app/reports", label: "Reports", icon: BarChart3, minRole: "VIEWER" },
  { href: "/app/team", label: "Team", icon: Users, minRole: "ADMIN" },
  { href: "/app/settings", label: "Settings", icon: Settings, minRole: "ADMIN" },
];

function canAccess(userRole: SessionUser["role"], minRole?: NavItem["minRole"]) {
  if (!minRole) {
    return true;
  }
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole);
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

  return (
    <div className="saas-app workspace-app">
      <aside className="saas-sidebar">
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
            {(user.name ?? user.email)
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
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
          {navItems
            .filter((item) => canAccess(user.role, item.minRole))
            .map(({ href, label, icon: Icon }) => {
              const active =
                href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(href);
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
          <Link className="ai-workspace-link" href="/ai/app">
            Open Sheetomatic AI
          </Link>
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
