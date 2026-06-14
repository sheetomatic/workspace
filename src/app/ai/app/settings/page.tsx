import { AiReplySettingsPanel } from "@/components/saas/ai-reply-settings-panel";
import { PageHeader } from "@/components/saas/page-header";
import { PendingWorkspacesPanel } from "@/components/saas/pending-workspaces-panel";
import { WhatsAppSettingsWorkspacePanel } from "@/components/saas/whatsapp-settings-workspace-panel";
import { WorkspaceActivationPanel } from "@/components/saas/workspace-activation-panel";
import { getAiReplyUsageSummary } from "@/lib/integrations/ai-reply-settings";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { formatRedlavaWalletAmount } from "@/lib/integrations/redlava";
import { loadSettingsResellerData } from "@/lib/settings-reseller-data";
import { canViewPlatformResellerData } from "@/lib/platform";
import { getWorkspaceTenantWallets } from "@/lib/whatsapp-wallet";
import { isWhatsAppProviderConfigured } from "@/lib/integrations/whatsapp-provider";
import {
  getWorkspaceWhatsAppSettings,
  listWhatsAppMembers,
  resolveWorkspaceWhatsAppCredentials,
  toWhatsAppSettingsFormValues,
} from "@/lib/whatsapp-settings";
import { loadMasWhatsAppLinkStatusForSettings } from "@/app/app/whatsapp/mas-actions";
import { getWhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";

export default async function SheetomaticAiSettingsPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const showResellerData = canViewPlatformResellerData(user);
  const organization = user.isSuperAdmin
    ? await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { name: true, status: true },
      })
    : null;
  const canEditAiReplyLimits =
    hasMinimumRole(user.role, "ADMIN") || user.isSuperAdmin;

  const [
    savedSettings,
    members,
    credentials,
    goLiveStatus,
    tenantWallets,
    resellerData,
    aiReplySummary,
    pendingWorkspaces,
    masLinkStatus,
  ] = await Promise.all([
    getWorkspaceWhatsAppSettings(user.organizationId),
    listWhatsAppMembers(user.organizationId),
    resolveWorkspaceWhatsAppCredentials(user.organizationId),
    getWhatsAppGoLiveStatus(user.organizationId),
    getWorkspaceTenantWallets(user.organizationId),
    showResellerData
      ? loadSettingsResellerData()
      : Promise.resolve({
          reseller: {
            ok: false as const,
            error: "Reseller API unavailable.",
            body: {},
            phones: [],
            customers: [],
          },
          wallet: { ok: false as const, error: "Wallet unavailable.", body: {} },
        }),
    getAiReplyUsageSummary(user.organizationId),
    user.isSuperAdmin
      ? prisma.organization.findMany({
          where: { status: "ONBOARDING" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            memberships: {
              where: { role: "OWNER" },
              take: 1,
              select: { user: { select: { email: true } } },
            },
          },
        })
      : Promise.resolve([]),
    loadMasWhatsAppLinkStatusForSettings(),
  ]);

  const settingsInitialValues = toWhatsAppSettingsFormValues(
    savedSettings,
    credentials,
  );

  return (
    <div className="saas-page ws-wa-page-shell ws-settings-page">
      <PageHeader
        title="Settings"
        description="Account, wallet, WhatsApp connection, and AI limits."
      />

      {!goLiveStatus.webhookReceived && goLiveStatus.isLive ? (
        <div className="saas-form-message error ws-wa-config-banner">
          WhatsApp is live but no inbound webhook has reached Sheetomatic yet.
          Set your Sheetomatic WhatsApp / Meta webhook callback to{" "}
          <code>{goLiveStatus.webhookUrlWithToken}</code>
          {goLiveStatus.verifyTokenConfigured
            ? ` (${goLiveStatus.verifyTokenHint.toLowerCase()}).`
            : `. ${goLiveStatus.verifyTokenHint}`}
        </div>
      ) : null}

      <WhatsAppSettingsWorkspacePanel
        credentialsReady={isWhatsAppProviderConfigured(credentials)}
        credentialsSource={credentials.source}
        goLiveStatus={goLiveStatus}
        hasSavedSecrets={{
          redlavaApiKey: Boolean(savedSettings?.redlavaApiKey),
          masPassword: Boolean(savedSettings?.masPassword),
          masApiKey: Boolean(savedSettings?.masApiKey),
        }}
        initialValues={settingsInitialValues}
        masLinkStatus={masLinkStatus}
        members={members}
        showResellerWallet={showResellerData}
        resellerWalletPoints={
          showResellerData &&
          resellerData.wallet.ok &&
          resellerData.wallet.currentPoints != null
            ? resellerData.wallet.currentPoints
            : null
        }
        tenantAiWalletLabel={
          tenantWallets?.ok
            ? formatRedlavaWalletAmount(
                tenantWallets.ai.balance,
                tenantWallets.ai.currency,
              )
            : null
        }
        tenantPendingCreditsLabel={
          tenantWallets?.ok
            ? formatRedlavaWalletAmount(
                tenantWallets.pendingTotal,
                tenantWallets.wa.currency,
              )
            : null
        }
        tenantWaWalletLabel={
          tenantWallets?.ok
            ? formatRedlavaWalletAmount(
                tenantWallets.wa.balance,
                tenantWallets.wa.currency,
              )
            : tenantWallets && !tenantWallets.ok
              ? tenantWallets.error
              : null
        }
        userEmail={user.email}
        userName={user.name ?? user.email.split("@")[0]}
        userRole={user.isSuperAdmin ? "Super Admin" : user.role}
      />

      <AiReplySettingsPanel
        canEdit={canEditAiReplyLimits}
        openaiConfigured={Boolean(process.env.OPENAI_API_KEY)}
        summary={aiReplySummary}
      />

      {organization ? (
        <WorkspaceActivationPanel
          organizationName={organization.name}
          status={organization.status}
        />
      ) : null}

      {user.isSuperAdmin ? (
        <PendingWorkspacesPanel
          workspaces={pendingWorkspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            ownerEmail: workspace.memberships[0]?.user.email ?? null,
            createdAt: workspace.createdAt.toLocaleDateString("en-IN", {
              timeZone: "Asia/Kolkata",
              dateStyle: "medium",
            }),
          }))}
        />
      ) : null}
    </div>
  );
}
