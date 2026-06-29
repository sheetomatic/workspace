"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { OrganizationSwitcher } from "@/components/saas/organization-switcher";
import type { OrganizationOption } from "@/components/saas/organization-switcher";
import type { SessionUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import {
  mergeWorkspaceAppearance,
  type WorkspaceAppearance,
} from "@/lib/workspace-appearance";
import {
  getWorkspaceNavSections,
  navIsActive,
  visibleWorkspaceNavItems,
  type WorkspaceNavItem,
} from "@/lib/workspace-navigation";

const ROLE_ORDER = ["VIEWER", "STAFF", "MANAGER", "ADMIN", "OWNER"] as const;

function NavLinks({
  items,
  pathname,
  variant,
}: {
  items: WorkspaceNavItem[];
  pathname: string;
  variant: "desktop" | "mobile";
}) {
  return items.map(({ href, label, icon: Icon, matchPrefix }) => {
    const active = navIsActive(pathname, href, matchPrefix);

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

function WorkspaceBrandLogo({ logoSrc, alt }: { logoSrc: string; alt: string }) {
  return (
    <span className="logo-mark">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} height={32} src={logoSrc} width={32} />
    </span>
  );
}

export function SaasShell({
  user,
  organizations,
  organizationPlan,
  organizationPlanLabel,
  appearance,
  children,
}: {
  user: SessionUser;
  organizations: OrganizationOption[];
  organizationPlan?: string | null;
  organizationPlanLabel?: string | null;
  appearance?: WorkspaceAppearance & { logoSrc: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const resolvedAppearance =
    appearance ??
    mergeWorkspaceAppearance(null, user.organizationName, undefined, Date.now());
  const showPlanBadge =
    Boolean(organizationPlan) &&
    ROLE_ORDER.indexOf(user.role) >= ROLE_ORDER.indexOf("ADMIN");
  const planLabel =
    organizationPlanLabel ?? (organizationPlan ? formatPlanLabel(organizationPlan) : null);

  const sections = getWorkspaceNavSections({
    user,
    organizationSlug: user.organizationSlug,
  });
  const mainSections = sections.filter((section) => section.id !== "settings");
  const settingsSection = sections.find((section) => section.id === "settings");
  const settingsItems = settingsSection
    ? visibleWorkspaceNavItems(user, settingsSection.items)
    : [];
  const mobileNavItems = sections.flatMap((section) =>
    visibleWorkspaceNavItems(user, section.items),
  );

  const productName = resolvedAppearance.productName;
  const brandSubtitle = resolvedAppearance.brandName || user.organizationName;

  return (
    <div className="saas-app workspace-app">
      <header className="ws-mobile-shell-header">
        <div className="ws-mobile-shell-brand">
          <WorkspaceBrandLogo alt={`${productName} logo`} logoSrc={resolvedAppearance.logoSrc} />
          <div className="ws-mobile-shell-brand-text">
            <strong>{productName}</strong>
            <span>{brandSubtitle}</span>
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
        <NavLinks items={mobileNavItems} pathname={pathname} variant="mobile" />
      </nav>

      <aside className="saas-sidebar ws-shell-desktop">
        <div className="crm-sidebar-head">
          <div className="saas-sidebar-brand">
            <WorkspaceBrandLogo alt={`${productName} logo`} logoSrc={resolvedAppearance.logoSrc} />
            <div>
              <strong>{productName}</strong>
              <span>{brandSubtitle}</span>
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
          {mainSections.map((section) => {
            const items = visibleWorkspaceNavItems(user, section.items);
            if (items.length === 0) {
              return null;
            }
            return (
              <div key={section.id}>
                <p className="saas-nav-section">{section.label}</p>
                <NavLinks items={items} pathname={pathname} variant="desktop" />
              </div>
            );
          })}
        </nav>

        {settingsItems.length > 0 && settingsSection ? (
          <div className="saas-sidebar-setup">
            <p className="saas-nav-section">{settingsSection.label}</p>
            <NavLinks items={settingsItems} pathname={pathname} variant="desktop" />
          </div>
        ) : null}

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
