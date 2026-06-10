import "@/components/saas/workspace-theme.css";
import "@/components/saas/ai-crm-theme.css";
import { redirect } from "next/navigation";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { AiShell } from "@/components/saas/ai-shell";
import { AiOnboardingGuard } from "@/components/saas/ai-onboarding-guard";
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
  const [organization, organizations, credentials, savedSettings, tenantWallets, skipOnboarding] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: sessionUser.organizationId },
      }),
      listOrganizationsForUser(sessionUser.id),
      resolveWorkspaceWhatsAppCredentials(sessionUser.organizationId),
      getWorkspaceWhatsAppSettings(sessionUser.organizationId),
      getWorkspaceTenantWallets(sessionUser.organizationId),
      shouldSkipAiOnboarding(sessionUser.organizationId),
    ]);

  if (!organization) {
    redirect(
      "/api/auth/signout?callbackUrl=" +
        encodeURIComponent("/login?error=workspace&product=ai"),
    );
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
