"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogIn, RefreshCw, Settings, X } from "lucide-react";
import { saveWhatsAppSettings } from "@/app/app/whatsapp/actions";
import {
  connectMasWebAccount,
  type MasConnectActionState,
} from "@/app/app/whatsapp/mas-actions";
import { whatsAppTemplateInitialState } from "@/lib/whatsapp-template-types";
import type { WhatsAppSettingsFormValues } from "@/lib/whatsapp-settings-form";
import { maskSecret } from "@/lib/whatsapp-settings-form";
import { MasWhatsAppConnectPanel } from "@/components/saas/mas-whatsapp-connect-panel";
import { masPortalUrl } from "@/lib/integrations/messageautosender";
import type {
  MasAccountDashboard,
  MasPhoneConnectionStatus,
} from "@/lib/integrations/messageautosender";

export type WhatsAppProviderTab = "sheetomatic" | "messageautosender";

const connectInitialState: MasConnectActionState = { ok: false, message: "" };

export function WhatsAppSettingsTrigger({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      aria-expanded={open}
      className="btn-cta btn-secondary ws-wa-settings-trigger"
      type="button"
      onClick={onToggle}
    >
      <Settings aria-hidden size={16} />
      Settings
    </button>
  );
}

export function WhatsAppSettingsPanel({
  initialValues,
  credentialsReady,
  hasSavedSecrets,
  masLinkStatus = null,
  masAccountDashboard = null,
  provider,
  onClose,
  embedded = false,
}: {
  initialValues: WhatsAppSettingsFormValues;
  credentialsReady: boolean;
  hasSavedSecrets: {
    redlavaApiKey: boolean;
    masPassword: boolean;
    masApiKey: boolean;
  };
  masLinkStatus?: MasPhoneConnectionStatus | null;
  masAccountDashboard?: MasAccountDashboard | null;
  provider: WhatsAppProviderTab;
  onClose?: () => void;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [settingsState, settingsAction, settingsPending] = useActionState(
    saveWhatsAppSettings,
    whatsAppTemplateInitialState,
  );
  const [connectState, connectAction, connectPending] = useActionState(
    connectMasWebAccount,
    connectInitialState,
  );

  useEffect(() => {
    if (settingsState.ok || connectState.ok) {
      router.refresh();
    }
  }, [settingsState, connectState, router]);

  const masCredentialsSaved =
    hasSavedSecrets.masPassword &&
    hasSavedSecrets.masApiKey &&
    Boolean(initialValues.masUsername);

  const isOfficial = provider === "sheetomatic";
  const pending = settingsPending || connectPending;

  return (
    <section className={`saas-panel ws-wa-settings-panel${embedded ? " is-embedded" : ""}`}>
      {!embedded ? (
        <header className="ws-wa-settings-head">
          <div>
            <h2>Settings</h2>
            <p>WhatsApp connection credentials.</p>
          </div>
          <button
            aria-label="Close settings"
            className="ws-new-task-close"
            type="button"
            onClick={() => onClose?.()}
          >
            <X size={18} />
          </button>
        </header>
      ) : null}

      <form
        action={settingsAction}
        className="ws-wa-provider-form"
        id="mas-web-connect-form"
      >
        <input name="whatsappProvider" type="hidden" value={provider} />

        <label className="ws-wa-side-phone">
          <span>Business WhatsApp number</span>
          <input
            defaultValue={initialValues.businessPhone}
            name="businessPhone"
            placeholder="9685788980"
            type="text"
          />
        </label>

        {isOfficial ? (
          <div className="ws-wa-side-fields">
            <label>
              API key
              <input
                name="redlavaApiKey"
                placeholder={
                  hasSavedSecrets.redlavaApiKey
                    ? maskSecret("saved-secret-key")
                    : "Paste API key"
                }
                type="password"
                autoComplete="off"
              />
            </label>
            <label>
              Phone ID
              <input
                defaultValue={initialValues.redlavaPhoneId}
                name="redlavaPhoneId"
                placeholder="1102997926228862"
                type="text"
              />
            </label>
          </div>
        ) : (
          <>
            <div className="ws-wa-side-fields">
              <label>
                Username
                <input
                  defaultValue={initialValues.masUsername}
                  name="masUsername"
                  placeholder="Account username"
                  type="text"
                  autoComplete="username"
                />
              </label>
              <label>
                Password
                <input
                  name="masPassword"
                  placeholder={
                    hasSavedSecrets.masPassword
                      ? maskSecret("saved-secret-key")
                      : "Password"
                  }
                  type="password"
                  autoComplete="current-password"
                />
              </label>
              <label>
                API key
                <input
                  name="masApiKey"
                  placeholder={
                    hasSavedSecrets.masApiKey
                      ? maskSecret("saved-secret-key")
                      : "API key"
                  }
                  type="password"
                  autoComplete="off"
                />
              </label>
            </div>

            {masCredentialsSaved || settingsState.ok || connectState.ok ? (
              <>
                <MasWhatsAppConnectPanel
                  compact
                  connectMessage={connectState.message}
                  connectOk={connectState.ok}
                  credentialsSaved={
                    masCredentialsSaved || settingsState.ok || connectState.ok
                  }
                  initialDashboard={masAccountDashboard}
                  initialQrImageUrl={connectState.qrImageUrl ?? null}
                  initialStatus={masLinkStatus}
                />
                <div className="ws-web-api-login-panel">
                  <p>
                    QR not loading? Use Login &amp; connect with the credentials
                    above.
                  </p>
                  <div className="ws-web-api-login-actions">
                    <button
                      className="btn-cta btn-secondary"
                      disabled={pending}
                      formAction={connectAction}
                      type="submit"
                    >
                      <LogIn size={14} aria-hidden />
                      {connectPending ? "Logging in..." : "Login & connect"}
                    </button>
                    <a
                      className="btn-cta btn-secondary"
                      href={masPortalUrl()}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Open web portal
                    </a>
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}

        <div className="ws-wa-side-foot">
          <p className="ws-wa-settings-lead is-compact">
            {credentialsReady
              ? "Credentials saved. Leave secret fields blank to keep current values."
              : isOfficial
                ? "Save to activate Official API."
                : "Save credentials first, then scan QR or use Login & connect."}
          </p>
          <button
            className="btn-cta btn-primary"
            disabled={pending}
            type="submit"
          >
            {settingsPending ? "Saving..." : "Save connection"}
          </button>
        </div>

        {settingsState.message ? (
          <p
            className={`saas-form-message ${settingsState.ok ? "ok" : "error"}`}
          >
            {settingsState.message}
          </p>
        ) : null}
        {connectState.message && connectMode === "login" ? (
          <p
            className={`saas-form-message ${connectState.ok ? "ok" : "error"}`}
          >
            {connectState.message}
          </p>
        ) : null}
        {connectState.ok && connectState.qrImageUrl && connectMode === "login" ? (
          <MasWhatsAppConnectPanel
            compact
            connectOk
            credentialsSaved
            initialQrImageUrl={connectState.qrImageUrl}
            initialStatus={masLinkStatus}
          />
        ) : null}
      </form>
    </section>
  );
}
