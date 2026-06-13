import { WhatsAppSettingsPanel } from "@/components/saas/whatsapp-settings-panel";
import type { WhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";
import type { WhatsAppSettingsFormValues } from "@/lib/whatsapp-settings-form";
import {
  redlavaDashboardUrl,
} from "@/lib/integrations/redlava-portal";
import Link from "next/link";
import type { MasPhoneConnectionStatus } from "@/lib/integrations/messageautosender";

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
  credentialsReady,
  credentialsSource,
  hasSavedSecrets,
  resellerWalletPoints = null,
  showResellerWallet = false,
  tenantWaWalletLabel = null,
  tenantAiWalletLabel = null,
  goLiveStatus,
  masLinkStatus = null,
  userName,
  userEmail,
  userRole,
}: {
  initialValues: WhatsAppSettingsFormValues;
  members: WhatsAppMember[];
  credentialsReady: boolean;
  credentialsSource: string;
  hasSavedSecrets: { redlavaApiKey: boolean; masPassword: boolean };
  resellerWalletPoints?: number | null;
  showResellerWallet?: boolean;
  tenantWaWalletLabel?: string | null;
  tenantAiWalletLabel?: string | null;
  goLiveStatus: WhatsAppGoLiveStatus;
  masLinkStatus?: MasPhoneConnectionStatus | null;
  userName: string;
  userEmail: string;
  userRole: string;
}) {
  const walletLoaded = Boolean(tenantWaWalletLabel && tenantAiWalletLabel);
  const walletHasError = Boolean(tenantWaWalletLabel && !tenantAiWalletLabel);

  return (
    <div className="ws-settings-workspace">
      <nav aria-label="Settings sections" className="ws-settings-section-nav">
        <a href="#account">Account</a>
        <a href="#wallet">Wallet</a>
        <a href="#whatsapp-connection">WhatsApp</a>
        <a href="#ai-reply-limits">AI limits</a>
      </nav>
      <div className="ws-settings-overview">
        <section className="saas-panel ws-settings-account-card" id="account">
          <h2>Account</h2>
          <dl className="ws-settings-meta-row">
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

        <section className="saas-panel ws-settings-wallet-card" id="wallet">
          <div className="ws-settings-wallet-head">
            <h2>Wallet</h2>
            <a
              className="ws-product-module-cta inline"
              href={redlavaDashboardUrl()}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open portal
            </a>
          </div>
          {walletLoaded ? (
            <div className="ws-settings-wallet-stats">
              <div className="ws-settings-wallet-stat">
                <span>WhatsApp messages</span>
                <strong>{tenantWaWalletLabel}</strong>
              </div>
              <div className="ws-settings-wallet-stat">
                <span>AI credits</span>
                <strong>{tenantAiWalletLabel}</strong>
              </div>
            </div>
          ) : walletHasError ? (
            <p className="ws-settings-wallet-empty">
              Could not load wallet balances. Save a valid API key, then refresh
              this page.
            </p>
          ) : (
            <p className="ws-settings-wallet-empty">
              Save your API key to view message and AI credit balances.
            </p>
          )}
        </section>
      </div>

      {showResellerWallet ? (
        <section
          className="saas-panel ws-settings-reseller-card"
          id="reseller-wallet"
        >
          <div className="ws-settings-wallet-head">
            <h2>Reseller wallet</h2>
            <span className="ws-settings-reseller-badge">Platform</span>
          </div>
          <p className="ws-settings-reseller-balance">
            {resellerWalletPoints != null
              ? `${resellerWalletPoints.toLocaleString()} points`
              : "Unavailable — contact Sheetomatic support."}
          </p>
        </section>
      ) : null}

      <section
        className="saas-panel ws-settings-connection-card"
        id="whatsapp-connection"
      >
        <div className="ws-settings-connection-head">
          <h2>WhatsApp</h2>
          <p className="ws-settings-connection-hint">
            Source: <strong>{credentialsSource}</strong> · After saving, finish
            webhook setup and tap Go Live on{" "}
            <Link href="/ai/app/campaign">Campaign</Link>.
          </p>
        </div>

        <WhatsAppSettingsPanel
          credentialsReady={credentialsReady}
          embedded
          hasSavedSecrets={hasSavedSecrets}
          initialValues={initialValues}
          masLinkStatus={masLinkStatus}
          members={members}
        />
      </section>

      <section className="saas-panel ws-settings-webhook-card">
        <h2>Webhook reference</h2>
        <dl className="ws-settings-webhook-meta">
          <div>
            <dt>Callback URL</dt>
            <dd>
              <code>{goLiveStatus.webhookUrlWithToken}</code>
            </dd>
          </div>
          <div>
            <dt>Verify token</dt>
            <dd>
              {goLiveStatus.verifyTokenConfigured
                ? "Configured on server"
                : goLiveStatus.verifyTokenHint}
            </dd>
          </div>
          <div>
            <dt>AI status</dt>
            <dd>
              <span
                className={`ws-settings-status-pill${goLiveStatus.isLive ? " is-live" : ""}`}
              >
                {goLiveStatus.isLive ? "Live" : "Not live"}
              </span>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
