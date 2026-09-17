import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "@/components/saas/workspace-theme.css";
import "@/components/saas/apple-design-system.css";
import "@/components/saas/workspace-glide.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { SaasShell } from "@/components/saas/saas-shell";
import { TrainingPortalShell } from "@/components/saas/training-portal-shell";
import { WorkspacePwaRegister } from "@/components/saas/workspace-pwa-register";
import { WorkspacePendingApproval } from "@/components/saas/workspace-pending-approval";
import { getDedicatedClientPortal } from "@/lib/dedicated-client-portals";
import { requireSession } from "@/lib/require-session";
import {
  ensureSessionTenantHost,
  getRequestPathname,
  getRequestTenantSlug,
  isLearnPortalRequest,
} from "@/lib/tenant-host";
import { isWhatsAppOnlyTeamMember } from "@/lib/tasks/org-task-policy";
import { WhatsAppOnlyGate } from "@/components/saas/whatsapp-only-gate";
import { isBillingPortalPath } from "@/lib/billing/access";
import { hasMinimumRole } from "@/lib/permissions";
import { WorkspaceResolvedShell } from "@/app/app/workspace-resolved-shell";

export async function generateMetadata(): Promise<Metadata> {
  if (await isLearnPortalRequest()) {
    return {
      title: "Learn | Sheetomatic",
      description: "Students and Teach — the Sheetomatic training portal.",
    };
  }

  const tenantSlug = await getRequestTenantSlug();
  const portal = getDedicatedClientPortal(tenantSlug);
  if (portal) {
    const productName = portal.defaultAppearance.productName ?? portal.name;
    return {
      title: `${productName} | Sheetomatic`,
      description: `Secure portal for ${productName}.`,
      manifest: "/app/manifest.webmanifest",
      appleWebApp: {
        capable: true,
        title: productName,
        statusBarStyle: "default",
      },
      icons: {
        apple: "/icons/workspace-icon-192.png?v=6",
      },
      other: {
        "mobile-web-app-capable": "yes",
      },
    };
  }

  return {
    title: "Workspace | Sheetomatic",
    description: "Client business control workspace for Sheetomatic customers.",
    manifest: "/app/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "Sheetomatic Workspace",
      statusBarStyle: "default",
    },
    icons: {
      apple: "/icons/workspace-icon-192.png?v=6",
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await requireSession();
  await ensureSessionTenantHost(sessionUser);
  const learnPortal = await isLearnPortalRequest();

  if (sessionUser.organizationStatus !== "ACTIVE" && !sessionUser.isSuperAdmin) {
    const pathname = await getRequestPathname();
    const canOpenBilling =
      (sessionUser.organizationStatus === "HOLD" ||
        sessionUser.organizationStatus === "INACTIVE") &&
      hasMinimumRole(sessionUser.role, "ADMIN") &&
      isBillingPortalPath(pathname);
    if (!canOpenBilling) {
      return (
        <WorkspacePendingApproval
          billingHref={
            hasMinimumRole(sessionUser.role, "ADMIN") ? "/app/billing" : undefined
          }
          organizationName={sessionUser.organizationName}
          status={sessionUser.organizationStatus}
        />
      );
    }
  }

  if (
    isWhatsAppOnlyTeamMember(
      sessionUser.organizationSlug,
      sessionUser.role,
      sessionUser.isSuperAdmin,
    )
  ) {
    return (
      <AuthSessionProvider>
        <WhatsAppOnlyGate
          organizationName={sessionUser.organizationName}
          userName={sessionUser.name?.trim() || sessionUser.email}
        />
      </AuthSessionProvider>
    );
  }

  if (learnPortal) {
    return (
      <AuthSessionProvider>
        <TrainingPortalShell
          organizationName={sessionUser.organizationName}
          userName={sessionUser.name?.trim() || sessionUser.email}
        >
          {children}
        </TrainingPortalShell>
      </AuthSessionProvider>
    );
  }

  const dedicatedPortal = getDedicatedClientPortal(sessionUser.organizationSlug);
  const currentOrgOption = {
    slug: sessionUser.organizationSlug,
    name: sessionUser.organizationName,
    role: sessionUser.role,
  };

  return (
    <AuthSessionProvider>
      <WorkspacePwaRegister />
      <Suspense
        fallback={
          <SaasShell
            hidePlanBadge={Boolean(dedicatedPortal)}
            isDedicatedPortal={Boolean(dedicatedPortal)}
            organizations={[currentOrgOption]}
            user={sessionUser}
          >
            {children}
          </SaasShell>
        }
      >
        <WorkspaceResolvedShell sessionUser={sessionUser}>
          {children}
        </WorkspaceResolvedShell>
      </Suspense>
    </AuthSessionProvider>
  );
}
