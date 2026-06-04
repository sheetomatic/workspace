import "@/components/saas/workspace-theme.css";
import "@/components/saas/ai-crm-theme.css";
import { redirect } from "next/navigation";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { AiShell } from "@/components/saas/ai-shell";
import { AiOnboardingGuard } from "@/components/saas/ai-onboarding-guard";
import { getRedlavaResellerWallet } from "@/lib/integrations/redlava-reseller";
import { listOrganizationsForUser } from "@/lib/auth-orgs";
import { shouldSkipAiOnboarding } from "@/lib/ai-onboarding";
import { prisma } from "@/lib/db";
import { canAccessAiApp } from "@/lib/ai-auth-links";
import { requireAiSession } from "@/lib/require-session";
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
  const showWallet = canAccessAiApp(sessionUser);
  const [organization, organizations, credentials, savedSettings, wallet, skipOnboarding] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: sessionUser.organizationId },
      }),
      listOrganizationsForUser(sessionUser.id),
      resolveWorkspaceWhatsAppCredentials(sessionUser.organizationId),
      getWorkspaceWhatsAppSettings(sessionUser.organizationId),
      showWallet ? getRedlavaResellerWallet() : Promise.resolve({ ok: false as const }),
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

  const walletPoints =
    wallet.ok && wallet.currentPoints != null ? wallet.currentPoints : null;

  return (
    <AuthSessionProvider>
      <AiShell
        organizations={organizations}
        showWallet={showWallet}
        user={user}
        walletPoints={walletPoints}
      >
        <AiOnboardingGuard skipOnboarding={skipOnboarding}>
          {children}
        </AiOnboardingGuard>
      </AiShell>
    </AuthSessionProvider>
  );
}
