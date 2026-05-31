import { WhatsAppSettingsPanel } from "@/components/saas/whatsapp-settings-panel";
import type { WhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";
import type { WhatsAppSettingsFormValues } from "@/lib/whatsapp-settings-form";
import type { RedlavaResellerPhone } from "@/lib/integrations/redlava-reseller";
import Link from "next/link";

type WhatsAppMember = {
  membershipId: string;
  name: string;
  email: string;
  phone: string | null;
  phoneFormatted: string | null;
  role: string;
};

export function WhatsAppSettingsWorkspacePanel({
  initialValues,
  members,
  credentialsSource,
  hasSavedSecrets,
  resellerPhones = [],
  resellerWalletPoints = null,
  goLiveStatus,
  userName,
  userEmail,
  userRole,
}: {
  initialValues: WhatsAppSettingsFormValues;
  members: WhatsAppMember[];
  credentialsSource: string;
  hasSavedSecrets: { redlavaApiKey: boolean };
  resellerPhones?: RedlavaResellerPhone[];
  resellerWalletPoints?: number | null;
  goLiveStatus: WhatsAppGoLiveStatus;
  userName: string;
  userEmail: string;
  userRole: string;
}) {
  return (
    <div className="ws-settings-workspace">
      <section className="saas-panel ws-settings-account-card" id="account">
        <h2>Account</h2>
        <dl className="ws-settings-account-grid">
          <div>
            <dt>Name</dt>
            <dd>{userName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{userEmail}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{userRole}</dd>
          </div>
        </dl>
      </section>

      <section className="saas-panel ws-settings-account-card" id="wallet">
        <h2>RedLava wallet</h2>
        <p className="ws-go-live-hint">
          Reseller wallet balance used for WhatsApp message credits on RedLava.
        </p>
        <p className="ws-settings-wallet-balance">
          {resellerWalletPoints != null
            ? `${resellerWalletPoints.toLocaleString()} points`
            : "Wallet unavailable - add REDLAVA_RESELLER_API_KEY on the server."}
        </p>
        <a
          className="ws-product-module-cta inline"
          href="https://wa.redlava.in"
          rel="noopener noreferrer"
          target="_blank"
        >
          Open RedLava dashboard
        </a>
      </section>

      <section className="saas-panel ws-settings-account-card">
        <h2>WhatsApp connection</h2>
        <p className="ws-go-live-hint">
          Credentials source: <strong>{credentialsSource}</strong>. After saving,
          finish webhook setup and tap Go Live on{" "}
          <Link href="/ai/app/campaign">Campaign</Link>.
        </p>
        <WhatsAppSettingsPanel
          credentialsSource={credentialsSource}
          embedded
          hasSavedSecrets={hasSavedSecrets}
          initialValues={initialValues}
          members={members}
          resellerPhones={resellerPhones}
          resellerWalletPoints={resellerWalletPoints}
        />
      </section>

      <section className="saas-panel ws-settings-account-card">
        <h2>Webhook reference</h2>
        <p>
          <strong>Callback URL:</strong> <code>{goLiveStatus.webhookUrl}</code>
        </p>
        <p>
          <strong>Verify token:</strong>{" "}
          {goLiveStatus.verifyTokenConfigured
            ? "Configured on server"
            : goLiveStatus.verifyTokenHint}
        </p>
        <p>
          <strong>AI status:</strong>{" "}
          {goLiveStatus.isLive ? "Live" : "Not live yet"}
        </p>
      </section>
    </div>
  );
}
