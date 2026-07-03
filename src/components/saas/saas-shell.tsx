"use client";

import { ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { OrganizationSwitcher } from "@/components/saas/organization-switcher";
import type { OrganizationOption } from "@/components/saas/organization-switcher";
import type { SessionUser } from "@/lib/auth";
import {
  mergeWorkspaceAppearance,
  type WorkspaceAppearance,
} from "@/lib/workspace-appearance";
import {
  mobileWorkspaceNavItems,
  getWorkspaceNavSections,
  navGroupHasActiveChild,
  navIsActive,
  visibleWorkspaceNavItems,
  type WorkspaceNavItem,
} from "@/lib/workspace-navigation";

const ROLE_ORDER = ["VIEWER", "STAFF", "MANAGER", "ADMIN", "OWNER"] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  matchPrefix,
  pathname,
  variant,
  nested = false,
  nestedDeep = false,
}: WorkspaceNavItem & {
  pathname: string;
  variant: "desktop" | "mobile";
  nested?: boolean;
  nestedDeep?: boolean;
}) {
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
      className={
        active
          ? `saas-nav-link active${nested ? " saas-nav-link-nested" : ""}${nestedDeep ? " saas-nav-link-nested-deep" : ""}`
          : `saas-nav-link${nested ? " saas-nav-link-nested" : ""}${nestedDeep ? " saas-nav-link-nested-deep" : ""}`
      }
      href={href}
    >
      <Icon size={nested ? 16 : 18} strokeWidth={2} />
      {label}
    </Link>
  );
}

function NavGroup({
  item,
  pathname,
  depth,
}: {
  item: WorkspaceNavItem;
  pathname: string;
  depth: number;
}) {
  const Icon = item.icon;
  const hasActiveChild = navGroupHasActiveChild(pathname, item);
  const selfActive = navIsActive(pathname, item.href, item.matchPrefix);
  const groupActive = selfActive || hasActiveChild;
  const [open, setOpen] = useState(groupActive);

  useEffect(() => {
    if (groupActive) {
      setOpen(true);
    }
  }, [groupActive, pathname]);

  return (
    <div
      className={`saas-nav-group${depth > 0 ? " saas-nav-group-nested" : ""}${groupActive ? " is-active" : ""}${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className={`saas-nav-link saas-nav-group-toggle${depth > 0 ? " saas-nav-link-nested" : ""}${selfActive && !hasActiveChild ? " active" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`nav-group-${item.href.replace(/\//g, "-")}`}
      >
        <Icon size={depth > 0 ? 16 : 18} strokeWidth={2} />
        <span className="saas-nav-group-label">{item.label}</span>
        <ChevronDown className="saas-nav-chevron" size={16} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          id={`nav-group-${item.href.replace(/\//g, "-")}`}
          className={`saas-nav-children${depth > 0 ? " saas-nav-children-deep" : ""}`}
        >
          <NavLinks
            depth={depth + 1}
            items={item.children ?? []}
            pathname={pathname}
            variant="desktop"
          />
        </div>
      ) : null}
    </div>
  );
}

function NavLinks({
  items,
  pathname,
  variant,
  depth = 0,
}: {
  items: WorkspaceNavItem[];
  pathname: string;
  variant: "desktop" | "mobile";
  depth?: number;
}) {
  if (variant === "mobile") {
    return items.map((item) => (
      <NavLink key={item.href} pathname={pathname} variant="mobile" {...item} />
    ));
  }

  return items.map((item) => {
    if (item.children?.length) {
      return (
        <NavGroup key={item.href} depth={depth} item={item} pathname={pathname} />
      );
    }

    return (
      <NavLink
        key={item.href}
        nested={depth > 0}
        nestedDeep={depth > 1}
        pathname={pathname}
        variant="desktop"
        {...item}
      />
    );
  });
}

function formatPlanLabel(plan: string) {
  return plan
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isCustomWorkspaceLogo(src: string) {
  return src.startsWith("/api/workspace/logo");
}

function WorkspaceBrandLogo({
  logoSrc,
  alt,
  light = false,
  productName,
}: {
  logoSrc: string;
  alt: string;
  light?: boolean;
  productName?: string;
}) {
  if (!logoSrc?.trim()) {
    const initials = (productName ?? alt)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");
    return (
      <span aria-hidden className="logo-mark ws-brand-initials">
        {initials || "?"}
      </span>
    );
  }

  const src =
    !isCustomWorkspaceLogo(logoSrc) && light
      ? "/images/sheetomatic-icon-light.svg"
      : logoSrc;

  return (
    <span className="logo-mark">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        className="ws-brand-mark-img"
        height={28}
        src={src}
        width={28}
      />
    </span>
  );
}

function WorkspaceSidebarBrand({
  appearance,
  organizationName,
  dedicatedPortal = false,
}: {
  appearance: WorkspaceAppearance & {
    logoSrc: string;
    lockupSrc: string;
    lockupLightSrc: string;
  };
  organizationName: string;
  dedicatedPortal?: boolean;
}) {
  const custom = isCustomWorkspaceLogo(appearance.logoSrc);

  if (custom) {
    return (
      <div className="saas-sidebar-brand">
        <img
          alt={appearance.productName}
          className="ws-sidebar-brand-lockup ws-sidebar-brand-lockup--custom"
          src={appearance.lockupSrc}
        />
        <span className="ws-sidebar-org-name">{appearance.brandName}</span>
      </div>
    );
  }

  if (dedicatedPortal) {
    return (
      <div className="saas-sidebar-brand saas-sidebar-brand--dedicated">
        <strong className="ws-dedicated-product-name">
          {appearance.productName}
        </strong>
        <span className="ws-sidebar-org-name">
          {appearance.brandName || organizationName}
        </span>
      </div>
    );
  }

  return (
    <div className="saas-sidebar-brand saas-sidebar-brand--lockup">
      <img
        alt="Sheetomatic"
        className="ws-sidebar-brand-lockup ws-sidebar-brand-lockup--on-dark"
        height={24}
        src={appearance.lockupLightSrc}
        width={168}
      />
      <img
        alt=""
        aria-hidden
        className="ws-sidebar-brand-lockup ws-sidebar-brand-lockup--on-light"
        height={24}
        src={appearance.lockupSrc}
        width={168}
      />
      <span className="ws-sidebar-org-name">{organizationName}</span>
    </div>
  );
}

export function SaasShell({
  user,
  organizations,
  organizationPlan,
  organizationPlanLabel,
  appearance,
  hidePlanBadge = false,
  isDedicatedPortal = false,
  children,
}: {
  user: SessionUser;
  organizations: OrganizationOption[];
  organizationPlan?: string | null;
  organizationPlanLabel?: string | null;
  appearance?: WorkspaceAppearance & {
    logoSrc: string;
    lockupSrc: string;
    lockupLightSrc: string;
  };
  hidePlanBadge?: boolean;
  isDedicatedPortal?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isQuotationPrint =
    /^\/app\/leads\/quotations\/[^/]+\/print\/?$/.test(pathname);

  if (isQuotationPrint) {
    return <div className="quotation-print-standalone">{children}</div>;
  }

  const resolvedAppearance =
    appearance ??
    mergeWorkspaceAppearance(null, user.organizationName, undefined, Date.now());
  const showPlanBadge =
    !hidePlanBadge &&
    Boolean(organizationPlan) &&
    ROLE_ORDER.indexOf(user.role) >= ROLE_ORDER.indexOf("ADMIN");
  const planLabel =
    organizationPlanLabel ?? (organizationPlan ? formatPlanLabel(organizationPlan) : null);

  const sections = getWorkspaceNavSections({
    user,
    organizationSlug: user.organizationSlug,
  });
  const mainSections = sections.filter(
    (section) => section.id !== "settings" && section.id !== "reports",
  );
  const settingsSection = sections.find((section) => section.id === "settings");
  const settingsItems = settingsSection
    ? visibleWorkspaceNavItems(user, settingsSection.items)
    : [];
  const mobileNavItems = mobileWorkspaceNavItems(
    mainSections.flatMap((section) => visibleWorkspaceNavItems(user, section.items)),
  );

  const productName = resolvedAppearance.productName;
  const brandSubtitle = resolvedAppearance.brandName || user.organizationName;
  const customBrand =
    isCustomWorkspaceLogo(resolvedAppearance.logoSrc) || isDedicatedPortal;

  return (
    <div className="saas-app workspace-app">
      <header className="ws-mobile-shell-header">
        <div className="ws-mobile-shell-brand">
          <WorkspaceBrandLogo
            alt={productName}
            light={!isDedicatedPortal}
            logoSrc={resolvedAppearance.logoSrc}
            productName={productName}
          />
          <div className="ws-mobile-shell-brand-text">
            <strong>{customBrand ? productName : user.organizationName}</strong>
            {customBrand ? <span>{brandSubtitle}</span> : null}
          </div>
        </div>
        {!isDedicatedPortal ? (
          <OrganizationSwitcher
            className="ws-mobile-shell-org-switcher"
            currentSlug={user.organizationSlug}
            organizations={organizations}
          />
        ) : null}
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
          <WorkspaceSidebarBrand
            appearance={resolvedAppearance}
            dedicatedPortal={isDedicatedPortal}
            organizationName={user.organizationName}
          />
        </div>

        {!isDedicatedPortal ? (
          <OrganizationSwitcher
            currentSlug={user.organizationSlug}
            organizations={organizations}
          />
        ) : null}

        <nav className="saas-nav" aria-label="Workspace">
          {mainSections.map((section) => {
            const items = visibleWorkspaceNavItems(user, section.items);
            if (items.length === 0) {
              return null;
            }
            return (
              <div key={section.id}>
                {section.label ? (
                  <p className="saas-nav-section">{section.label}</p>
                ) : null}
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
