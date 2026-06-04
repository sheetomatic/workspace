"use client";

import { LogOut, Settings, User, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";

export function AiCrmTopbar({
  user,
  showWallet = false,
  walletPoints,
}: {
  user: SessionUser;
  showWallet?: boolean;
  walletPoints?: number | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const crumbs = breadcrumbTrail(pathname);
  const initials = (user.name ?? user.email)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="ai-crm-topbar">
      <div className="ai-crm-breadcrumb">
        {crumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`}>
            {index > 0 ? (
              <span aria-hidden className="ai-crm-breadcrumb-sep">
                /
              </span>
            ) : null}
            {crumb.href ? (
              <Link
                className={
                  index === crumbs.length - 1
                    ? undefined
                    : "ai-crm-breadcrumb-muted ai-crm-breadcrumb-link"
                }
                href={crumb.href}
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={
                  index === crumbs.length - 1 ? undefined : "ai-crm-breadcrumb-muted"
                }
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </div>

      <div className="ai-crm-topbar-actions">
        {showWallet ? (
          <Link
            className="ai-crm-credits-pill is-link"
            href="/ai/app/settings#wallet"
            title="RedLava wallet balance"
          >
            <Wallet size={14} aria-hidden />
            {walletPoints != null
              ? walletPoints.toLocaleString()
              : "Wallet"}
          </Link>
        ) : null}

        <div className="ai-crm-account-menu" ref={menuRef}>
          <button
            aria-expanded={menuOpen}
            className="ai-crm-user-pill is-button"
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {initials}
          </button>

          {menuOpen ? (
            <div className="ai-crm-account-dropdown">
              <div className="ai-crm-account-head">
                <strong>{user.name ?? user.email.split("@")[0]}</strong>
                <span>{user.email}</span>
                <span className="ai-crm-account-role">
                  {user.isSuperAdmin ? "Super Admin" : ROLE_LABELS[user.role]}
                </span>
              </div>
              <Link href="/ai/app/settings" onClick={() => setMenuOpen(false)}>
                <Settings size={15} aria-hidden />
                Settings
              </Link>
              <Link href="/ai/app/settings#account" onClick={() => setMenuOpen(false)}>
                <User size={15} aria-hidden />
                Account
              </Link>
              {showWallet ? (
                <Link href="/ai/app/settings#wallet" onClick={() => setMenuOpen(false)}>
                  <Wallet size={15} aria-hidden />
                  Wallet
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/ai" })}
              >
                <LogOut size={15} aria-hidden />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

type Crumb = { label: string; href?: string };

const LABELS: Record<string, string> = {
  "/ai/app": "Dashboard",
  "/ai/app/onboarding": "Onboarding",
  "/ai/app/inbox": "Chats",
  "/ai/app/contacts": "Contacts",
  "/ai/app/tickets": "Tickets",
  "/ai/app/campaign": "Campaign",
  "/ai/app/templates": "Templates",
  "/ai/app/channels": "Campaign",
  "/ai/app/knowledge": "AI Training Data",
  "/ai/app/ai-brain": "AI Agents",
  "/ai/app/automations": "Workflows",
  "/ai/app/analytics": "Analytics",
  "/ai/app/settings": "Settings",
  "/ai/app/integrations": "Integrations",
};

function breadcrumbTrail(pathname: string): Crumb[] {
  if (pathname === "/ai/app/knowledge") {
    return [
      { label: "AI Training Data", href: "/ai/app/knowledge" },
      { label: "Articles" },
    ];
  }

  if (pathname.startsWith("/ai/app/ai-brain/kb-search")) {
    return [
      { label: "AI Agents", href: "/ai/app/ai-brain" },
      { label: "Kb Search Agent" },
    ];
  }

  if (LABELS[pathname]) {
    return [{ label: LABELS[pathname] }];
  }

  const match = Object.entries(LABELS)
    .filter(([path]) => path !== "/ai/app")
    .find(([path]) => pathname.startsWith(path));

  return [{ label: match?.[1] ?? "Dashboard" }];
}
