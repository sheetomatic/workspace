import "@/components/saas/workspace-theme.css";
import "@/components/saas/workspace-typography.css";
import "@/components/saas/ai-crm-theme.css";
import { redirect } from "next/navigation";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { AiShell } from "@/components/saas/ai-shell";
import { AiOnboardingGuard } from "@/components/saas/ai-onboarding-guard";
import { WorkspacePendingApproval } from "@/components/saas/workspace-pending-approval";
import { formatRedlavaWalletAmount } from "@/lib/integrations/redlava";
import { listOrganizationsForUser } from "@/lib/auth-orgs";
import { shouldSkipAiOnboarding } from "@/lib/ai-onboarding";
import { prisma } from "@/lib/db";
import { requireAiSession } from "@/lib/require-session";
import { getWorkspaceTenantWallets } from "@/lib/whatsapp-wallet";
import {
  getWorkspaceWhatsAppSettings,
  resolveWorkspaceWhatsAppCredentials,
} from "@/lib/whatsapp-settings";

export const metadata = {
  title: "Sheetomatic AI",
  description:
    "WhatsApp AI chatbot, team inbox, CRM, and automation for growing businesses.",
};

export default async function SheetomaticAiAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await requireAiSession();
  const [organization, organizations, credentials, savedSettings, tenantWallets, skipOnboarding, unreadAgg] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: sessionUser.organizationId },
      }),
      listOrganizationsForUser(sessionUser.id),
      resolveWorkspaceWhatsAppCredentials(sessionUser.organizationId),
      getWorkspaceWhatsAppSettings(sessionUser.organizationId),
      getWorkspaceTenantWallets(sessionUser.organizationId),
      shouldSkipAiOnboarding(sessionUser.organizationId),
      prisma.waContact.aggregate({
        where: { organizationId: sessionUser.organizationId },
        _sum: { unreadCount: true },
      }),
    ]);

  if (!organization) {
    redirect(
      "/api/auth/signout?callbackUrl=" +
        encodeURIComponent("/login?error=workspace&product=ai"),
    );
  }

  if (organization.status !== "ACTIVE" && !sessionUser.isSuperAdmin) {
    return <WorkspacePendingApproval organizationName={organization.name} />;
  }

  const user = {
    ...sessionUser,
    organizationName: organization.name,
  };

  const integrationsConnected = Boolean(
    credentials.redlavaApiKey && (credentials.redlavaPhoneId || savedSettings?.redlavaPhoneId),
  );

  const walletLabel =
    tenantWallets?.ok
      ? formatRedlavaWalletAmount(
          tenantWallets.wa.balance,
          tenantWallets.wa.currency,
        )
      : null;

  return (
    <AuthSessionProvider>
      <AiShell
        inboxUnreadCount={unreadAgg._sum.unreadCount ?? 0}
        organizations={organizations}
        showWallet={integrationsConnected}
        user={user}
        walletLabel={walletLabel}
      >
        <AiOnboardingGuard skipOnboarding={skipOnboarding}>
          {children}
        </AiOnboardingGuard>
      </AiShell>
    </AuthSessionProvider>
  );
}
