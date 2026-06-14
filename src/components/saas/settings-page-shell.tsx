"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bot,
  CreditCard,
  Globe,
  KeyRound,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import { WhatsAppSettingsPanel } from "@/components/saas/whatsapp-settings-panel";
import type { WhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";
import type { WhatsAppSettingsFormValues } from "@/lib/whatsapp-settings-form";
import { redlavaDashboardUrl } from "@/lib/integrations/redlava-portal";
import type {
  MasAccountDashboard,
  MasPhoneConnectionStatus,
} from "@/lib/integrations/messageautosender";

type SettingsTab = "account" | "wallet" | "official-api" | "web-api" | "ai";
type WhatsAppProviderTab = "sheetomatic" | "messageautosender";

const TAB_HASH: Record<SettingsTab, string> = {
  account: "account",
  wallet: "wallet",
  "official-api": "official-api",
  "web-api": "web-api",
  ai: "ai-limits",
};

function hashToTab(hash: string): SettingsTab | null {
  const value = hash.replace(/^#/, "");
  if (value === "account") return "account";
  if (value === "wallet") return "wallet";
  if (value === "official-api" || value === "whatsapp-connection") return "official-api";
  if (value === "web-api") return "web-api";
  if (value === "ai-limits") return "ai";
  return null;
}

function channelStatusLabel(status: string, connected: boolean) {
  if (connected || status === "SUCCESS") return "Connected";
  if (status === "IMAGE_VISIBLE") return "Scan QR";
  if (status === "TRYING_TO_REACH_PHONE") return "Connecting";
  return "Not connected";
}

function formatDashboardValue(value: string | number | null | undefined) {
  if (value == null || value === "") return "-";
  return String(value);
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function SettingsPageShell({
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
  aiLimitsSlot,
  adminSlot = null,
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
  aiLimitsSlot: ReactNode;
  adminSlot?: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [walletView, setWalletView] = useState<WhatsAppProviderTab>(
    initialValues.whatsappProvider,
  );

  useEffect(() => {
    setWalletView(initialValues.whatsappProvider);
  }, [initialValues.whatsappProvider]);

  useEffect(() => {
    const syncFromHash = () => {
      const tab = hashToTab(window.location.hash);
      if (tab) {
        setActiveTab(tab);
        if (tab === "official-api") setWalletView("sheetomatic");
        if (tab === "web-api") setWalletView("messageautosender");
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const goToTab = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
    if (tab === "official-api") setWalletView("sheetomatic");
    if (tab === "web-api") setWalletView("messageautosender");
    window.history.replaceState(null, "", `#${TAB_HASH[tab]}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const isWebProvider = walletView === "messageautosender";
  const officialConnected = credentialsReady && goLiveStatus.isLive;
  const webConnected = Boolean(
    masAccountDashboard?.connected || masLinkStatus?.connected,
  );
  const webConfigured = Boolean(
    hasSavedSecrets.masPassword &&
      hasSavedSecrets.masApiKey &&
      initialValues.masUsername,
  );
  const waConnected = isWebProvider ? webConnected : officialConnected;

  const walletLoaded = Boolean(tenantWaWalletLabel && tenantAiWalletLabel);
  const walletHasError = Boolean(tenantWaWalletLabel && !tenantAiWalletLabel);
  const webApiDashboardReady = Boolean(masAccountDashboard || masLinkStatus);

  const navItems: Array<{
    id: SettingsTab;
    label: string;
    icon: typeof UserRound;
    hint?: string;
    badge?: boolean;
  }> = [
    { id: "account", label: "Account", icon: UserRound },
    { id: "wallet", label: "Wallet", icon: CreditCard },
    {
      id: "official-api",
      label: "Official API",
      icon: KeyRound,
      hint: officialConnected ? "Live" : undefined,
      badge: !officialConnected && initialValues.whatsappProvider === "sheetomatic",
    },
    {
      id: "web-api",
      label: "Web Based API",
      icon: Globe,
      hint: webConnected ? "Live" : undefined,
      badge: !webConnected,
    },
    { id: "ai", label: "AI limits", icon: Bot },
  ];

  return (
    <div className="ws-settings-pro">
      <aside className="ws-settings-pro-sidebar" aria-label="Settings navigation">
        <div className="ws-settings-pro-profile">
          <span className="ws-settings-pro-avatar" aria-hidden>
            {userInitials(userName)}
          </span>
          <div>
            <strong>{userName}</strong>
            <span>{userRole}</span>
          </div>
        </div>

        <nav className="ws-settings-pro-nav">
          {navItems.map(({ id, label, icon: Icon, hint, badge }) => (
            <button
              key={id}
              aria-current={activeTab === id ? "page" : undefined}
              className={`ws-settings-pro-nav-item${activeTab === id ? " is-active" : ""}`}
              type="button"
              onClick={() => goToTab(id)}
            >
              <Icon size={17} aria-hidden />
              <span>{label}</span>
              {badge ? (
                <span className="ws-settings-pro-nav-badge">!</span>
              ) : hint ? (
                <span className="ws-settings-pro-nav-hint">{hint}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="ws-settings-pro-sidebar-foot">
          <div
            className={`ws-settings-pro-connection${waConnected ? " is-connected" : ""}`}
          >
            {waConnected ? (
              <Wifi size={15} aria-hidden />
            ) : (
              <WifiOff size={15} aria-hidden />
            )}
            <span>{waConnected ? "WhatsApp connected" : "WhatsApp not connected"}</span>
          </div>
          {!webConnected ? (
            <button
              className="btn-cta btn-primary ws-settings-connect-wa"
              type="button"
              onClick={() => goToTab("web-api")}
            >
              Connect WA
            </button>
          ) : null}
        </div>
      </aside>

      <div className="ws-settings-pro-main">
        {activeTab === "account" ? (
          <section className="ws-settings-pro-panel">
            <header className="ws-settings-pro-panel-head">
              <div>
                <h2>Account</h2>
                <p>Your workspace identity and access level.</p>
              </div>
            </header>
            <div className="ws-settings-pro-card">
              <dl className="ws-settings-pro-meta">
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
            </div>
            {adminSlot ? (
              <div className="ws-settings-pro-admin-stack">{adminSlot}</div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "wallet" ? (
          <section className="ws-settings-pro-panel">
            <header className="ws-settings-pro-panel-head">
              <div>
                <h2>{isWebProvider ? "Web Based API credits" : "Official API wallet"}</h2>
                <p>
                  {isWebProvider
                    ? "Account balance and connection status for Web Based API."
                    : "Message and AI credit balances for Official API."}
                </p>
              </div>
              <div className="ws-settings-wallet-toggle">
                <button
                  className={`ws-settings-wallet-toggle-btn${!isWebProvider ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setWalletView("sheetomatic")}
                >
                  Official
                </button>
                <button
                  className={`ws-settings-wallet-toggle-btn${isWebProvider ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setWalletView("messageautosender")}
                >
                  Web
                </button>
              </div>
            </header>

            {isWebProvider ? (
              !webConnected ? (
                <div className="ws-settings-pro-empty">
                  <Globe size={28} aria-hidden />
                  <h3>
                    {webConfigured
                      ? "Scan QR to connect WhatsApp"
                      : "Set up Web Based API"}
                  </h3>
                  <p>
                    {webConfigured
                      ? "Open Web Based API in the sidebar and scan the QR code."
                      : "Save credentials on the Web Based API tab first."}
                  </p>
                  <button
                    className="btn-cta btn-primary"
                    type="button"
                    onClick={() => goToTab("web-api")}
                  >
                    Connect WA
                  </button>
                </div>
              ) : webApiDashboardReady ? (
                <div className="ws-settings-pro-stat-grid">
                  <article className="ws-settings-pro-stat">
                    <span>Account type</span>
                    <strong>{formatDashboardValue(masAccountDashboard?.accountType)}</strong>
                  </article>
                  <article className="ws-settings-pro-stat">
                    <span>Valid until</span>
                    <strong>{formatDashboardValue(masAccountDashboard?.validUntil)}</strong>
                  </article>
                  <article className="ws-settings-pro-stat">
                    <span>Credit count</span>
                    <strong>{formatDashboardValue(masAccountDashboard?.creditCount)}</strong>
                  </article>
                </div>
              ) : null
            ) : walletLoaded ? (
              <div className="ws-settings-pro-stat-grid">
                <article className="ws-settings-pro-stat">
                  <span>WhatsApp messages</span>
                  <strong>{tenantWaWalletLabel}</strong>
                </article>
                <article className="ws-settings-pro-stat">
                  <span>AI credits</span>
                  <strong>{tenantAiWalletLabel}</strong>
                </article>
                <article className="ws-settings-pro-stat">
                  <span>Credits pending</span>
                  <strong>{tenantPendingCreditsLabel ?? "\u20B90.00"}</strong>
                </article>
              </div>
            ) : walletHasError ? (
              <div className="ws-settings-pro-empty is-error">
                <p>Could not load wallet balances. Save a valid API key, then refresh.</p>
              </div>
            ) : (
              <div className="ws-settings-pro-empty">
                <CreditCard size={28} aria-hidden />
                <h3>No wallet data yet</h3>
                <p>Save your Official API key to view balances.</p>
                <button
                  className="btn-cta btn-primary"
                  type="button"
                  onClick={() => goToTab("official-api")}
                >
                  Set up Official API
                </button>
              </div>
            )}

            {!isWebProvider ? (
              <a
                className="btn-cta btn-secondary"
                href={redlavaDashboardUrl()}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open portal
              </a>
            ) : null}

            {showResellerWallet ? (
              <article className="ws-settings-pro-card ws-settings-pro-reseller">
                <div className="ws-settings-pro-card-head">
                  <h3>Reseller wallet</h3>
                  <span className="ws-settings-reseller-badge">Platform</span>
                </div>
                <p className="ws-settings-reseller-balance">
                  {resellerWalletPoints != null
                    ? `${resellerWalletPoints.toLocaleString()} points`
                    : "Unavailable - contact Sheetomatic support."}
                </p>
              </article>
            ) : null}
          </section>
        ) : null}

        {activeTab === "official-api" ? (
          <section className="ws-settings-pro-panel">
            <header className="ws-settings-pro-panel-head">
              <div>
                <h2>Official API</h2>
                <p>
                  Meta Cloud API key + Phone ID. Source:{" "}
                  <strong>{credentialsSource}</strong> &middot; Go Live on{" "}
                  <Link href="/ai/app/campaign">Campaign</Link> after saving.
                </p>
              </div>
              <span
                className={`ws-web-api-status-pill${officialConnected ? " is-connected" : ""}`}
              >
                {officialConnected ? "Connected" : credentialsReady ? "Saved" : "Not set up"}
              </span>
            </header>

            <div className="ws-settings-pro-card ws-settings-pro-wa-card">
              <WhatsAppSettingsPanel
                credentialsReady={credentialsReady}
                embedded
                hasSavedSecrets={hasSavedSecrets}
                initialValues={initialValues}
                masAccountDashboard={masAccountDashboard}
                masLinkStatus={masLinkStatus}
                provider="sheetomatic"
              />
            </div>

            <article className="ws-settings-pro-card">
              <h3>Webhook reference</h3>
              <dl className="ws-settings-pro-webhook">
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
            </article>
          </section>
        ) : null}

        {activeTab === "web-api" ? (
          <section className="ws-settings-pro-panel">
            <header className="ws-settings-pro-panel-head">
              <div>
                <h2>Web Based API</h2>
                <p>Account login and QR scan to link WhatsApp on your phone.</p>
              </div>
              <span
                className={`ws-web-api-status-pill${webConnected ? " is-connected" : ""}`}
              >
                {webConnected
                  ? "Connected"
                  : webConfigured
                    ? "Scan QR"
                    : "Not set up"}
              </span>
            </header>

            <div className="ws-settings-pro-card ws-settings-pro-wa-card">
              <WhatsAppSettingsPanel
                credentialsReady={credentialsReady}
                embedded
                hasSavedSecrets={hasSavedSecrets}
                initialValues={initialValues}
                masAccountDashboard={masAccountDashboard}
                masLinkStatus={masLinkStatus}
                provider="messageautosender"
              />
            </div>
          </section>
        ) : null}

        {activeTab === "ai" ? (
          <section className="ws-settings-pro-panel">
            <header className="ws-settings-pro-panel-head">
              <div>
                <h2>AI limits</h2>
                <p>Control OpenAI usage for inbound WhatsApp knowledge replies.</p>
              </div>
            </header>
            <div className="ws-settings-pro-ai-slot">{aiLimitsSlot}</div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
