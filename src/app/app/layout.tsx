import type { Metadata, Viewport } from "next";
import "@/components/saas/workspace-theme.css";
import { redirect } from "next/navigation";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { SaasShell } from "@/components/saas/saas-shell";
import { WorkspacePwaInstallBanner } from "@/components/saas/workspace-pwa-install-banner";
import { WorkspacePwaRegister } from "@/components/saas/workspace-pwa-register";
import { WorkspacePendingApproval } from "@/components/saas/workspace-pending-approval";
import { listOrganizationsForUser } from "@/lib/auth-orgs";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

export const metadata: Metadata = {
  title: "Workspace | Sheetomatic",
  description: "Client business control workspace for Sheetomatic customers.",
  manifest: "/app/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Sheetomatic Workspace",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/workspace-icon-192.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await requireSession();
  const [organization, organizations] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: sessionUser.organizationId },
    }),
    listOrganizationsForUser(sessionUser.id),
  ]);

  if (!organization) {
    redirect(
      "/api/auth/signout?callbackUrl=" +
        encodeURIComponent("/login?error=workspace"),
    );
  }

  if (organization.status !== "ACTIVE" && !sessionUser.isSuperAdmin) {
    return <WorkspacePendingApproval organizationName={organization.name} />;
  }

  const user = {
    ...sessionUser,
    organizationName: organization.name,
  };

  return (
    <AuthSessionProvider>
      <WorkspacePwaRegister />
      <SaasShell organizations={organizations} user={user}>
        <WorkspacePwaInstallBanner />
        {children}
      </SaasShell>
    </AuthSessionProvider>
  );
}
