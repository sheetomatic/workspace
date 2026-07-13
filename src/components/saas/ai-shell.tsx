"use client";

import { ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AiCrmTopbar } from "@/components/saas/ai-crm-topbar";
import { OrganizationSwitcher } from "@/components/saas/organization-switcher";
import { BrandIconMark } from "@/components/brand/brand-icon-mark";
import type { OrganizationOption } from "@/components/saas/organization-switcher";
import type { SessionUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import {
  AI_ADVANCED_NAV_ITEMS,
  AI_MAIN_NAV_ITEMS,
  canAccessAiNav,
  type AiNavItem,
} from "@/lib/ai-nav-config";

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  badgeCount = 0,
}: AiNavItem & { pathname: string; badgeCount?: number }) {
  const active =
    href === "/ai/app" ? pathname === "/ai/app" : pathname.startsWith(href);

  return (
    <Link
      className={active ? "ai-crm-nav-link active" : "ai-crm-nav-link"}
      href={href}
    >
      <Icon size={17} strokeWidth={2} />
      {label}
      {badgeCount > 0 ? (
        <span className="ai-crm-nav-badge" aria-label={`${badgeCount} unread`}>
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

export function AiShell({
  user,
  organizations,
  showWallet = false,
  walletLabel,
  inboxUnreadCount = 0,
  children,
}: {
  user: SessionUser;
  organizations: OrganizationOption[];
  showWallet?: boolean;
  walletLabel?: string | null;
  inboxUnreadCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/ai/app/onboarding");

  const essentialItems = AI_MAIN_NAV_ITEMS.filter((item) =>
    canAccessAiNav(user.role, item.minRole),
  );
  const advancedItems = AI_ADVANCED_NAV_ITEMS.filter((item) =>
    canAccessAiNav(user.role, item.minRole),
  );

  return (
    <div className="saas-app workspace-app ai-app ai-crm-app">
      {!isOnboarding ? (
        <aside className="ai-crm-sidebar">
          <div className="ai-crm-brand-row">
            <Link className="ai-crm-brand" href="/ai/app">
              <span className="logo-mark">
                <BrandIconMark size={22} />
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
            {essentialItems.map((item) => (
              <NavLink
                key={item.href}
                pathname={pathname}
                {...item}
                badgeCount={
                  item.href === "/ai/app/inbox" ? inboxUnreadCount : 0
                }
              />
            ))}

            {advancedItems.length > 0 ? (
              <>
                <p className="ai-crm-nav-section">Advanced</p>
                {advancedItems.map((item) => (
                  <NavLink key={item.href} pathname={pathname} {...item} />
                ))}
              </>
            ) : null}
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
