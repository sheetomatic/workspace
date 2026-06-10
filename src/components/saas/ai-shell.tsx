"use client";

import {
  BarChart3,
  Bot,
  BookOpen,
  ChevronDown,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Radio,
  Plug,
  Settings,
  Ticket,
  Users,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AiCrmTopbar } from "@/components/saas/ai-crm-topbar";
import { OrganizationSwitcher } from "@/components/saas/organization-switcher";
import type { OrganizationOption } from "@/components/saas/organization-switcher";
import type { SessionUser } from "@/lib/auth";
import { AI_APP_MIN_ROLE } from "@/lib/ai-auth-links";
import { ROLE_LABELS } from "@/lib/permissions";
import { siteBrand } from "@/app/site-content";

const ROLE_ORDER = ["VIEWER", "STAFF", "MANAGER", "ADMIN", "OWNER"] as const;

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  minRole?: (typeof ROLE_ORDER)[number];
};

const mainNavItems: NavItem[] = [
  { href: "/ai/app", label: "Dashboard", icon: LayoutDashboard, minRole: AI_APP_MIN_ROLE },
  { href: "/ai/app/inbox", label: "Chats", icon: MessageCircle, minRole: AI_APP_MIN_ROLE },
  { href: "/ai/app/contacts", label: "CRM", icon: Users, minRole: AI_APP_MIN_ROLE },
  { href: "/ai/app/tickets", label: "Support hub", icon: Ticket, minRole: AI_APP_MIN_ROLE },
  {
    href: "/ai/app/analytics",
    label: "Analytics",
    icon: BarChart3,
    minRole: AI_APP_MIN_ROLE,
  },
  {
    href: "/ai/app/campaign",
    label: "Campaign",
    icon: Radio,
    minRole: "ADMIN",
  },
  {
    href: "/ai/app/templates",
    label: "Templates",
    icon: FileCheck2,
    minRole: "ADMIN",
  },
  {
    href: "/ai/app/settings",
    label: "Settings",
    icon: Settings,
    minRole: "ADMIN",
  },
];

const automationNavItems: NavItem[] = [
  {
    href: "/ai/app/knowledge",
    label: "AI Training Data",
    icon: BookOpen,
    minRole: "ADMIN",
  },
  { href: "/ai/app/ai-brain", label: "AI Agents", icon: Bot, minRole: "ADMIN" },
  {
    href: "/ai/app/integrations",
    label: "Integrations",
    icon: Plug,
    minRole: "ADMIN",
  },
  {
    href: "/ai/app/automations",
    label: "Workflows",
    icon: Workflow,
    minRole: "ADMIN",
  },
];

function canAccess(userRole: SessionUser["role"], minRole?: NavItem["minRole"]) {
  if (!minRole) {
    return true;
  }
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole);
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: NavItem & { pathname: string }) {
  const active =
    href === "/ai/app" ? pathname === "/ai/app" : pathname.startsWith(href);

  return (
    <Link
      className={active ? "ai-crm-nav-link active" : "ai-crm-nav-link"}
      href={href}
    >
      <Icon size={17} strokeWidth={2} />
      {label}
    </Link>
  );
}

export function AiShell({
  user,
  organizations,
  showWallet = false,
  walletLabel,
  children,
}: {
  user: SessionUser;
  organizations: OrganizationOption[];
  showWallet?: boolean;
  walletLabel?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/ai/app/onboarding");

  return (
    <div className="saas-app workspace-app ai-app ai-crm-app">
      {!isOnboarding ? (
        <aside className="ai-crm-sidebar">
          <div className="ai-crm-brand-row">
            <Link className="ai-crm-brand" href="/ai/app">
              <span className="logo-mark">
                <Image
                  src={siteBrand.logoSrc}
                  alt={siteBrand.logoAlt}
                  width={28}
                  height={28}
                />
              </span>
              <strong>Sheetomatic AI</strong>
              <ChevronDown aria-hidden size={14} />
            </Link>
          </div>

          <OrganizationSwitcher
            currentSlug={user.organizationSlug}
            organizations={organizations}
          />

          <nav className="ai-crm-nav" aria-label="Sheetomatic AI">
            {mainNavItems
              .filter((item) => canAccess(user.role, item.minRole))
              .map((item) => (
                <NavLink key={item.href} pathname={pathname} {...item} />
              ))}

            <p className="ai-crm-nav-section">Automation</p>
            {automationNavItems
              .filter((item) => canAccess(user.role, item.minRole))
              .map((item) => (
                <NavLink key={item.href} pathname={pathname} {...item} />
              ))}
          </nav>

          <div className="ai-crm-sidebar-foot">
            <span className="ai-crm-user-meta">
              {user.name ?? user.email.split("@")[0]}
              <small>{user.isSuperAdmin ? "Super Admin" : ROLE_LABELS[user.role]}</small>
            </span>
            <Link className="ai-workspace-link" href="/app">
              MIS Workspace
            </Link>
            <button
              className="ai-crm-signout"
              type="button"
              onClick={() => signOut({ callbackUrl: "/ai" })}
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </aside>
      ) : null}

      <div className="ai-crm-main">
        {!isOnboarding ? (
          <AiCrmTopbar showWallet={showWallet} user={user} walletLabel={walletLabel} />
        ) : null}
        <div className="ai-crm-content">{children}</div>
      </div>
    </div>
  );
}
