"use client";

import { ChevronDown, LogOut, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  DEFAULT_WORKSPACE_NAV_PREFS,
  type WorkspaceNavPrefs,
} from "@/lib/workspace-nav-prefs";
import {
  filterNavItemsByPrefs,
  mobileWorkspaceNavItems,
  getWorkspaceNavSections,
  navGroupHasActiveChild,
  navIsActive,
  visibleWorkspaceNavItems,
  type WorkspaceNavItem,
} from "@/lib/workspace-navigation";

const ROLE_ORDER = ["VIEWER", "STAFF", "MANAGER", "ADMIN", "OWNER"] as const;

/** Avoid useSearchParams() — it suspends the whole shell and blanks the main pane. */
function useLocationSearch(pathname: string) {
  const [currentSearch, setCurrentSearch] = useState("");
  useEffect(() => {
    setCurrentSearch(
      typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "",
    );
  }, [pathname]);
  return currentSearch;
}

function navItemKey(item: Pick<WorkspaceNavItem, "label" | "href">) {
  return `${item.label}::${item.href}`;
}

function NavLink({
  href,
  label,
  icon: Icon,
  matchPrefix,
  pathname,
  currentSearch,
  variant,
  nested = false,
  nestedDeep = false,
}: WorkspaceNavItem & {
  pathname: string;
  currentSearch: string;
  variant: "desktop" | "mobile";
  nested?: boolean;
  nestedDeep?: boolean;
}) {
  const router = useRouter();
  const active = navIsActive(pathname, href, matchPrefix, currentSearch);
  const prefetchHref = href.split("?")[0] ?? href;

  function prefetch() {
    if (prefetchHref.startsWith("/app")) {
      router.prefetch(prefetchHref);
    }
  }

  if (variant === "mobile") {
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={active ? "ws-mobile-nav-link active" : "ws-mobile-nav-link"}
        href={href}
        onFocus={prefetch}
        onMouseEnter={prefetch}
        prefetch
      >
        <Icon size={20} strokeWidth={2} />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={
        active
          ? `saas-nav-link active${nested ? " saas-nav-link-nested" : ""}${nestedDeep ? " saas-nav-link-nested-deep" : ""}`
          : `saas-nav-link${nested ? " saas-nav-link-nested" : ""}${nestedDeep ? " saas-nav-link-nested-deep" : ""}`
      }
      href={href}
      onFocus={prefetch}
      onMouseEnter={prefetch}
      prefetch
    >
      <Icon size={nested ? 16 : 18} strokeWidth={2} />
      {label}
    </Link>
  );
}

function NavGroup({
  item,
  pathname,
  currentSearch,
  depth,
}: {
  item: WorkspaceNavItem;
  pathname: string;
  currentSearch: string;
  depth: number;
}) {
  const Icon = item.icon;
  const hasActiveChild = navGroupHasActiveChild(pathname, item, currentSearch);
  const selfActive = navIsActive(pathname, item.href, item.matchPrefix, currentSearch);
  const groupActive = selfActive || hasActiveChild;
  const [manualOpen, setManualOpen] = useState(groupActive);
  const open = groupActive || manualOpen;

  return (
    <div
      className={`saas-nav-group${depth > 0 ? " saas-nav-group-nested" : ""}${groupActive ? " is-active" : ""}${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className={`saas-nav-link saas-nav-group-toggle${depth > 0 ? " saas-nav-link-nested" : ""}${selfActive && !hasActiveChild ? " active" : ""}`}
        onClick={() => setManualOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`nav-group-${navItemKey(item).replace(/[^a-zA-Z0-9_-]/g, "-")}`}
      >
        <Icon size={depth > 0 ? 16 : 18} strokeWidth={2} />
        <span className="saas-nav-group-label">{item.label}</span>
        <ChevronDown className="saas-nav-chevron" size={16} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          id={`nav-group-${navItemKey(item).replace(/[^a-zA-Z0-9_-]/g, "-")}`}
          className={`saas-nav-children${depth > 0 ? " saas-nav-children-deep" : ""}`}
        >
          <NavLinks
            depth={depth + 1}
            items={item.children ?? []}
            pathname={pathname}
            currentSearch={currentSearch}
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
  currentSearch,
  variant,
  depth = 0,
}: {
  items: WorkspaceNavItem[];
  pathname: string;
  currentSearch: string;
  variant: "desktop" | "mobile";
  depth?: number;
}) {
  if (variant === "mobile") {
    return items.map((item) => (
      <NavLink
        key={navItemKey(item)}
        currentSearch={currentSearch}
        pathname={pathname}
        variant="mobile"
        {...item}
      />
    ));
  }

  return items.map((item) => {
    if (item.children?.length) {
      return (
        <NavGroup
          key={navItemKey(item)}
          currentSearch={currentSearch}
          depth={depth}
          item={item}
          pathname={pathname}
        />
      );
    }

    return (
      <NavLink
        key={navItemKey(item)}
        currentSearch={currentSearch}
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
  navPrefs = DEFAULT_WORKSPACE_NAV_PREFS,
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
  navPrefs?: WorkspaceNavPrefs;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentSearch = useLocationSearch(pathname);
  const isQuotationPrint =
    /^\/app\/leads\/quotations\/[^/]+\/print\/?$/.test(pathname);
  const isSalarySlipPrint =
    /^\/app\/hr\/payroll\/slip\/[^/]+\/?$/.test(pathname);

  if (isQuotationPrint) {
    return <div className="quotation-print-standalone">{children}</div>;
  }
  if (isSalarySlipPrint) {
    return <div className="salary-slip-standalone">{children}</div>;
  }

  const resolvedAppearance =
    appearance ??
    mergeWorkspaceAppearance(null, user.organizationName, undefined, user.organizationSlug);
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

  function sectionItems(sectionItemsRaw: WorkspaceNavItem[]) {
    const allowed = visibleWorkspaceNavItems(user, sectionItemsRaw);
    return isDedicatedPortal ? allowed : filterNavItemsByPrefs(allowed, navPrefs);
  }

  const mobileNavItems = mobileWorkspaceNavItems(
    mainSections.flatMap((section) => sectionItems(section.items)),
  );

  const productName = resolvedAppearance.productName;
  const brandSubtitle = resolvedAppearance.brandName || user.organizationName;
  const customBrand =
    isCustomWorkspaceLogo(resolvedAppearance.logoSrc) || isDedicatedPortal;
  const navigationLabel = isDedicatedPortal ? `${productName} navigation` : "Workspace";
  const mobileNavigationLabel = isDedicatedPortal
    ? `${productName} navigation`
    : "Workspace navigation";
  const signOutPath = isDedicatedPortal ? "/login" : "/";
  const showCustomize = !isDedicatedPortal;

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
            onClick={() => signOut({ callbackUrl: signOutPath })}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="ws-mobile-shell-nav" aria-label={mobileNavigationLabel}>
        <NavLinks
          currentSearch={currentSearch}
          items={mobileNavItems}
          pathname={pathname}
          variant="mobile"
        />
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

        <nav className="saas-nav" aria-label={navigationLabel}>
          {mainSections.map((section) => {
            const items = sectionItems(section.items);
            if (items.length === 0) {
              return null;
            }
            return (
              <div key={section.id}>
                {section.label ? (
                  <p className="saas-nav-section">{section.label}</p>
                ) : null}
                <NavLinks
                  currentSearch={currentSearch}
                  items={items}
                  pathname={pathname}
                  variant="desktop"
                />
              </div>
            );
          })}
        </nav>

        {settingsItems.length > 0 && settingsSection ? (
          <div className="saas-sidebar-setup">
            <p className="saas-nav-section">{settingsSection.label}</p>
            <NavLinks
              currentSearch={currentSearch}
              items={settingsItems}
              pathname={pathname}
              variant="desktop"
            />
            {showCustomize ? (
              <Link
                className="saas-nav-link saas-nav-customize"
                href="/app/settings#focus-modules"
                prefetch
              >
                <SlidersHorizontal size={16} strokeWidth={2} />
                Customize
              </Link>
            ) : null}
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
            onClick={() => signOut({ callbackUrl: signOutPath })}
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
