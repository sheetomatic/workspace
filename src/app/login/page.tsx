import "@/components/saas/workspace-login.css";
import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandIconMark } from "@/components/brand/brand-icon-mark";
import { LoginForm } from "@/components/saas/login-form";
import { WorkspaceThemeStyles } from "@/components/saas/workspace-theme-styles";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getDedicatedClientPortal } from "@/lib/dedicated-client-portals";
import { getRequestTenantSlug, isLearnPortalRequest } from "@/lib/tenant-host";
import { workspaceLoginHref } from "@/lib/workspace-auth-links";
import {
  mergeWorkspaceAppearance,
  parseWorkspaceAppearance,
} from "@/lib/workspace-appearance";

async function loadTenantOrg(tenantSlug: string | null) {
  if (!tenantSlug) {
    return null;
  }
  // Defer Prisma until a tenant host/query needs branding — keeps default
  // workspace.sheetomatic.com/login off the DB cold-start path.
  const { prisma } = await import("@/lib/db");
  return prisma.organization.findUnique({
    where: { slug: tenantSlug },
    select: {
      name: true,
      slug: true,
      logoUrl: true,
      workspaceAppearance: true,
      updatedAt: true,
    },
  });
}

export async function generateMetadata({
  searchParams: _searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}): Promise<Metadata> {
  const tenantSlug = await getRequestTenantSlug();
  const portal = getDedicatedClientPortal(tenantSlug);
  if (portal) {
    const productName = portal.defaultAppearance.productName ?? portal.name;
    return {
      title: `Sign in | ${productName}`,
      description: `Secure sign in for ${productName}.`,
    };
  }

  if (await isLearnPortalRequest()) {
    return {
      title: "Sign in | Sheetomatic Learn",
      description: "Trainer login for Students and Teach.",
    };
  }

  return {
    title: "Sign in | Sheetomatic Workspace",
    description: "Secure client login for Sheetomatic business control systems.",
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string;
    intent?: string;
    org?: string;
    callbackUrl?: string;
  }>;
}) {
  const { product, org: orgFromQuery } = await searchParams;
  const tenantSlug = orgFromQuery?.trim() || (await getRequestTenantSlug());
  const tenantOrg = await loadTenantOrg(tenantSlug);
  const dedicatedPortal = getDedicatedClientPortal(tenantSlug);
  const tenantAppearance = tenantOrg
    ? mergeWorkspaceAppearance(
        parseWorkspaceAppearance(tenantOrg.workspaceAppearance) ??
          dedicatedPortal?.defaultAppearance ??
          null,
        tenantOrg.name,
        tenantOrg.logoUrl,
        tenantOrg.updatedAt.getTime(),
        { dedicatedPortal: Boolean(dedicatedPortal) },
      )
    : dedicatedPortal
      ? mergeWorkspaceAppearance(
          dedicatedPortal.defaultAppearance,
          dedicatedPortal.name,
          null,
          Date.now(),
          { dedicatedPortal: true },
        )
      : null;
  const isAiProduct = product === "ai";
  const isLearnProduct = product === "learn";
  const loginKicker = dedicatedPortal
    ? "MACT case management"
    : isAiProduct
        ? "WhatsApp AI workspace"
        : isLearnProduct
          ? "Teach and student portal"
          : "Client workspace";
  const loginTitle = tenantOrg
    ? `Sign in to ${tenantOrg.name}`
    : tenantSlug && !tenantOrg
      ? "Workspace not found"
      : isAiProduct
          ? "Sign in to Sheetomatic AI"
          : isLearnProduct
            ? "Sign in to Teach"
            : "Sign in to your workspace";

  return (
    <main className="login-page workspace-login">
      {/* Warm the post-login route so /app paints faster after sign-in. */}
      <Link className="sr-only" href="/app" prefetch>
        Workspace
      </Link>
      {tenantAppearance ? (
        <WorkspaceThemeStyles appearance={tenantAppearance} />
      ) : null}
      <section className="login-brand">
        <Link
          className="login-logo"
          href={
            dedicatedPortal
              ? "/login"
              : isAiProduct
                ? "/ai"
                : isLearnProduct
                  ? "/learn"
                  : "/"
          }
        >
          {dedicatedPortal ? (
            <span className="login-logo-text">{tenantAppearance?.productName}</span>
          ) : (
            <>
              <span className="logo-mark">
                <BrandIconMark size={26} priority theme="light" />
              </span>
              <span>
                {isAiProduct
                  ? "Sheetomatic AI"
                  : isLearnProduct
                    ? "Sheetomatic Learn"
                      : "Sheetomatic"}
              </span>
            </>
          )}
        </Link>
        <div className="login-brand-copy">
          <p className="login-kicker">{loginKicker}</p>
          <h1>{loginTitle}</h1>
          <p>
            {tenantSlug && !tenantOrg ? (
              <>
                No workspace is registered for{" "}
                <strong>{tenantSlug}.sheetomatic.com</strong>. Check the link
                from your admin or sign in at the main workspace portal.
              </>
            ) : null}
            {!tenantSlug || tenantOrg
              ? isAiProduct
                ? "Enter your email and password to open Chats, Campaign, and AI settings."
                : isLearnProduct
                  ? "Use your workspace email and password. You will only see Students and Teach — not the rest of CRM."
                  : tenantOrg
                    ? `Use your workspace email and password for ${tenantOrg.name}.`
                    : "Access is provisioned after purchase. Owners and team members sign in with credentials shared by Sheetomatic or your admin."
              : null}
          </p>
        </div>
        <ul className="login-trust-list">
          {isAiProduct ? (
            <>
              <li>
                <CheckCircle2 size={18} />
                AI replies, team inbox, and CRM in one place
              </li>
              <li>
                <CheckCircle2 size={18} />
                Official WhatsApp Business API via RedLava
              </li>
            </>
          ) : isLearnProduct ? (
            <>
              <li>
                <CheckCircle2 size={18} />
                Students, live sessions, and the curriculum you teach
              </li>
              <li>
                <CheckCircle2 size={18} />
                Students sign in separately at /learn
              </li>
            </>
          ) : (
            <>
              <li>
                <CheckCircle2 size={18} />
                One secure login per company
              </li>
              <li>
                <CheckCircle2 size={18} />
                Owners see what matters; staff see only their work
              </li>
            </>
          )}
        </ul>
      </section>

      <section className="login-form-panel">
        {tenantSlug && !tenantOrg ? (
          <div className="login-card">
            <p className="login-error">
              This workspace is not set up yet. Contact your administrator if you
              expected access here.
            </p>
            <p className="login-switch-mode">
              <Link href={workspaceLoginHref()}>Go to workspace login</Link>
            </p>
          </div>
        ) : (
          <Suspense fallback={<div className="login-card">Loading...</div>}>
            <LoginForm />
          </Suspense>
        )}
      </section>
    </main>
  );
}
