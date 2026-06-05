import { PageHeader } from "@/components/saas/page-header";
import { WhatsAppSettingsWorkspacePanel } from "@/components/saas/whatsapp-settings-workspace-panel";
import { requireSession } from "@/lib/require-session";
import { loadSettingsResellerData } from "@/lib/settings-reseller-data";
import { canViewPlatformResellerData } from "@/lib/platform";
import {
  getWorkspaceWhatsAppSettings,
  listWhatsAppMembers,
  resolveWorkspaceWhatsAppCredentials,
  toWhatsAppSettingsFormValues,
} from "@/lib/whatsapp-settings";
import { getWhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";

export default async function SheetomaticAiSettingsPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const showResellerData = canViewPlatformResellerData(user);
  const [savedSettings, members, credentials, goLiveStatus, resellerData] =
    await Promise.all([
      getWorkspaceWhatsAppSettings(user.organizationId),
      listWhatsAppMembers(user.organizationId),
      resolveWorkspaceWhatsAppCredentials(user.organizationId),
      getWhatsAppGoLiveStatus(user.organizationId),
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
    ]);

  const settingsInitialValues = toWhatsAppSettingsFormValues(
    savedSettings,
    credentials,
  );

  return (
    <div className="saas-page ws-wa-page-shell">
      <PageHeader
        title="Settings"
        description="WhatsApp API connection, team numbers, wallet, and workspace preferences."
      />

      {!goLiveStatus.webhookReceived && goLiveStatus.isLive ? (
        <div className="saas-form-message error ws-wa-config-banner">
          WhatsApp is live but no inbound webhook has reached Sheetomatic yet.
          Set your RedLava / Meta webhook callback to{" "}
          <code>{goLiveStatus.webhookUrl}</code>
          {goLiveStatus.verifyTokenConfigured
            ? ` (${goLiveStatus.verifyTokenHint.toLowerCase()}).`
            : `. ${goLiveStatus.verifyTokenHint}`}
        </div>
      ) : null}

      <WhatsAppSettingsWorkspacePanel
        credentialsSource={credentials.source}
        goLiveStatus={goLiveStatus}
        hasSavedSecrets={{
          redlavaApiKey: Boolean(savedSettings?.redlavaApiKey),
        }}
        initialValues={settingsInitialValues}
        members={members}
        showResellerWallet={showResellerData}
        resellerPhones={
          showResellerData && resellerData.reseller.ok
            ? resellerData.reseller.phones
            : []
        }
        resellerWalletPoints={
          showResellerData &&
          resellerData.wallet.ok &&
          resellerData.wallet.currentPoints != null
            ? resellerData.wallet.currentPoints
            : null
        }
        userEmail={user.email}
        userName={user.name ?? user.email.split("@")[0]}
        userRole={user.isSuperAdmin ? "Super Admin" : user.role}
      />
    </div>
  );
}
