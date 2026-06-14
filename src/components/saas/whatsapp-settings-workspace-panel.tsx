import { WhatsAppSettingsWorkspaceClient } from "@/components/saas/whatsapp-settings-workspace-client";
import type { WhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";
import type { WhatsAppSettingsFormValues } from "@/lib/whatsapp-settings-form";
import type {
  MasAccountDashboard,
  MasPhoneConnectionStatus,
} from "@/lib/integrations/messageautosender";

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
}) {
  return (
    <WhatsAppSettingsWorkspaceClient
      credentialsReady={credentialsReady}
      credentialsSource={credentialsSource}
      goLiveStatus={goLiveStatus}
      hasSavedSecrets={hasSavedSecrets}
      initialValues={initialValues}
      masAccountDashboard={masAccountDashboard}
      masLinkStatus={masLinkStatus}
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
