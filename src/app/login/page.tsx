import "@/components/saas/workspace-theme.css";
import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandIconMark } from "@/components/brand/brand-icon-mark";
import { LoginForm } from "@/components/saas/login-form";
import { WorkspaceThemeStyles } from "@/components/saas/workspace-theme-styles";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDedicatedClientPortal } from "@/lib/dedicated-client-portals";
import { getRequestTenantSlug } from "@/lib/tenant-host";
import { workspaceLoginHref } from "@/lib/workspace-auth-links";
import {
  mergeWorkspaceAppearance,
  parseWorkspaceAppearance,
} from "@/lib/workspace-appearance";

export async function generateMetadata(): Promise<Metadata> {
  const tenantSlug = await getRequestTenantSlug();
  const portal = getDedicatedClientPortal(tenantSlug);
  if (portal) {
    const productName = portal.defaultAppearance.productName ?? portal.name;
    return {
      title: `Sign in | ${productName}`,
      description: `Secure sign in for ${productName}.`,
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
  searchParams: Promise<{ product?: string; intent?: string; org?: string }>;
}) {
  const { product, intent, org: orgFromQuery } = await searchParams;
  const tenantSlug = orgFromQuery?.trim() || (await getRequestTenantSlug());
  const tenantOrg = tenantSlug
    ? await prisma.organization.findUnique({
        where: { slug: tenantSlug },
        select: {
          name: true,
          slug: true,
          logoUrl: true,
          workspaceAppearance: true,
          updatedAt: true,
        },
      })
    : null;
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
  const isAiLogin = isAiProduct && intent === "login";
  const isAiSignup = isAiProduct && intent === "start";
  const isWorkspaceSignup = !isAiProduct && intent === "start";
  const isSignup = isAiSignup || isWorkspaceSignup;

  return (
    <main className="login-page workspace-login">
      {tenantAppearance ? (
        <WorkspaceThemeStyles appearance={tenantAppearance} />
      ) : null}
      <section className="login-brand">
        <Link
          className="login-logo"
          href={dedicatedPortal ? "/login" : isAiProduct ? "/ai" : "/"}
        >
          {dedicatedPortal ? (
            <span className="login-logo-text">{tenantAppearance?.productName}</span>
          ) : (
            <>
              <span className="logo-mark">
                <BrandIconMark size={26} priority theme="light" />
              </span>
              <span>{isAiProduct ? "Sheetomatic AI" : "Sheetomatic"}</span>
            </>
          )}
        </Link>
        <div className="login-brand-copy">
          <p className="login-kicker">
            {dedicatedPortal
              ? "MACT case management"
              : isAiProduct
                ? "WhatsApp AI workspace"
                : "Client workspace"}
          </p>
          <h1>
            {isAiLogin
              ? "Welcome back"
              : isSignup
                ? isAiProduct
                  ? "Start free on Sheetomatic AI"
                  : "Create your company workspace"
                : tenantOrg
                  ? `Sign in to ${tenantOrg.name}`
                  : tenantSlug && !tenantOrg
                    ? "Workspace not found"
                    : isAiProduct
                      ? "Automate WhatsApp with AI"
                      : "Sign in to your workspace"}
          </h1>
          <p>
            {tenantSlug && !tenantOrg ? (
              <>
                No workspace is registered for{" "}
                <strong>{tenantSlug}.sheetomatic.com</strong>. Check the link
                from your admin or sign in at the main workspace portal.
              </>
            ) : null}
            {!tenantSlug || tenantOrg
              ? isAiLogin
                ? "Enter your email and password to open Chats, Campaign, and AI settings."
                : isAiSignup
                  ? "Create a free workspace, connect WhatsApp, and train your AI in minutes."
                  : isWorkspaceSignup
                    ? "Sign up as the owner, then add team members with login credentials from Team."
                    : isAiProduct
                      ? "Sign in with your email and password to connect WhatsApp and go live."
                      : tenantOrg
                        ? `Use your workspace email and password for ${tenantOrg.name}.`
                        : "Owners sign in with the email they registered. Team members use credentials from their admin."
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
          ) : isWorkspaceSignup ? (
            <>
              <li>
                <CheckCircle2 size={18} />
                One owner account creates the workspace
              </li>
              <li>
                <CheckCircle2 size={18} />
                Admins add staff logins from Team settings
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
