import { AiReplySettingsPanel } from "@/components/saas/ai-reply-settings-panel";
import { PendingWorkspacesPanel } from "@/components/saas/pending-workspaces-panel";
import { SettingsPageShell } from "@/components/saas/settings-page-shell";
import { WorkspaceActivationPanel } from "@/components/saas/workspace-activation-panel";
import type { AiReplyUsageSummary } from "@/lib/integrations/ai-reply-settings";
import type { WhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";
import type { WhatsAppSettingsFormValues } from "@/lib/whatsapp-settings-form";
import type {
  MasAccountDashboard,
  MasPhoneConnectionStatus,
} from "@/lib/integrations/messageautosender";
import { isWebBasedApiUiEnabled } from "@/lib/web-based-api-ui";
import type { PendingWorkspaceRow } from "@/components/saas/pending-workspaces-panel";
import type { OrgPlan, WorkspaceModule } from "@prisma/client";

export function WhatsAppSettingsWorkspacePanel({
  initialValues,
  credentialsReady,
  credentialsSource,
  hasSavedSecrets,
  resellerWalletPoints = null,
  showResellerWallet = false,
  tenantWaWalletLabel = null,
  tenantAiWalletLabel = null,
  tenantPendingCreditsLabel = null,
  goLiveStatus,
  masLinkStatus = null,
  masAccountDashboard = null,
  userName,
  userEmail,
  userRole,
  canEditAiReplyLimits,
  openaiConfigured,
  aiReplySummary,
  organizationName = null,
  organizationStatus = null,
  organizationPlan = null,
  organizationAllowedModules = [],
  pendingWorkspaces = [],
  showAdminPanels = false,
  showWebBasedApi = isWebBasedApiUiEnabled(),
}: {
  initialValues: WhatsAppSettingsFormValues;
  credentialsReady: boolean;
  credentialsSource: string;
  hasSavedSecrets: { redlavaApiKey: boolean; masPassword: boolean; masApiKey: boolean };
  resellerWalletPoints?: number | null;
  showResellerWallet?: boolean;
  tenantWaWalletLabel?: string | null;
  tenantAiWalletLabel?: string | null;
  tenantPendingCreditsLabel?: string | null;
  goLiveStatus: WhatsAppGoLiveStatus;
  masLinkStatus?: MasPhoneConnectionStatus | null;
  masAccountDashboard?: MasAccountDashboard | null;
  userName: string;
  userEmail: string;
  userRole: string;
  canEditAiReplyLimits: boolean;
  openaiConfigured: boolean;
  aiReplySummary: AiReplyUsageSummary;
  organizationName?: string | null;
  organizationStatus?: "ONBOARDING" | "ACTIVE" | null;
  organizationPlan?: OrgPlan | null;
  organizationAllowedModules?: WorkspaceModule[];
  pendingWorkspaces?: PendingWorkspaceRow[];
  showAdminPanels?: boolean;
  showWebBasedApi?: boolean;
}) {
  const adminSlot = showAdminPanels ? (
    <>
      {organizationName && organizationStatus ? (
        <WorkspaceActivationPanel
          organizationName={organizationName}
          status={organizationStatus}
          plan={organizationPlan}
          allowedModules={organizationAllowedModules}
        />
      ) : null}
      <PendingWorkspacesPanel workspaces={pendingWorkspaces} />
    </>
  ) : null;

  return (
    <SettingsPageShell
      adminSlot={adminSlot}
      aiLimitsSlot={
        <AiReplySettingsPanel
          canEdit={canEditAiReplyLimits}
          openaiConfigured={openaiConfigured}
          summary={aiReplySummary}
        />
      }
      credentialsReady={credentialsReady}
      credentialsSource={credentialsSource}
      goLiveStatus={goLiveStatus}
      hasSavedSecrets={hasSavedSecrets}
      initialValues={initialValues}
      masAccountDashboard={masAccountDashboard}
      masLinkStatus={masLinkStatus}
      showWebBasedApi={showWebBasedApi}
      resellerWalletPoints={resellerWalletPoints}
      showResellerWallet={showResellerWallet}
      tenantAiWalletLabel={tenantAiWalletLabel}
      tenantPendingCreditsLabel={tenantPendingCreditsLabel}
      tenantWaWalletLabel={tenantWaWalletLabel}
      userEmail={userEmail}
      userName={userName}
      userRole={userRole}
    />
  );
}
