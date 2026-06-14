"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, KeyRound, Settings, X } from "lucide-react";
import { saveWhatsAppSettings } from "@/app/app/whatsapp/actions";
import { whatsAppTemplateInitialState } from "@/lib/whatsapp-template-types";
import type { WhatsAppSettingsFormValues } from "@/lib/whatsapp-settings-form";
import { maskSecret } from "@/lib/whatsapp-settings-form";
import { MasWhatsAppConnectPanel } from "@/components/saas/mas-whatsapp-connect-panel";
import type {
  MasAccountDashboard,
  MasPhoneConnectionStatus,
} from "@/lib/integrations/messageautosender";

type WhatsAppProviderTab = "sheetomatic" | "messageautosender";

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
  onProviderChange,
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
  onProviderChange?: (provider: WhatsAppProviderTab) => void;
  onClose?: () => void;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<WhatsAppProviderTab>(
    initialValues.whatsappProvider,
  );
  const [settingsState, settingsAction, settingsPending] = useActionState(
    saveWhatsAppSettings,
    whatsAppTemplateInitialState,
  );

  useEffect(() => {
    setProvider(initialValues.whatsappProvider);
  }, [initialValues.whatsappProvider]);

  useEffect(() => {
    onProviderChange?.(provider);
  }, [onProviderChange, provider]);

  useEffect(() => {
    if (settingsState.ok) {
      router.refresh();
    }
  }, [settingsState, router]);

  const masCredentialsSaved =
    hasSavedSecrets.masPassword &&
    hasSavedSecrets.masApiKey &&
    Boolean(initialValues.masUsername);

  const selectProvider = (next: WhatsAppProviderTab) => {
    setProvider(next);
  };

  return (
    <section className={`saas-panel ws-wa-settings-panel${embedded ? " is-embedded" : ""}`}>
      {!embedded ? (
        <header className="ws-wa-settings-head">
          <div>
            <h2>Settings</h2>
            <p>Pick a connection type from the sidebar and save.</p>
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

      <form action={settingsAction} className="ws-wa-side-layout">
        <input name="whatsappProvider" type="hidden" value={provider} />

        <aside aria-label="Connection type" className="ws-wa-side-nav">
          <button
            aria-current={provider === "sheetomatic" ? "true" : undefined}
            className={`ws-wa-side-nav-item${provider === "sheetomatic" ? " is-active" : ""}`}
            type="button"
            onClick={() => selectProvider("sheetomatic")}
          >
            <KeyRound size={16} aria-hidden />
            <span>
              <strong>Official API</strong>
              <small>Meta key + Phone ID</small>
            </span>
          </button>
          <button
            aria-current={provider === "messageautosender" ? "true" : undefined}
            className={`ws-wa-side-nav-item${provider === "messageautosender" ? " is-active" : ""}`}
            type="button"
            onClick={() => selectProvider("messageautosender")}
          >
            <Globe size={16} aria-hidden />
            <span>
              <strong>Web Based API</strong>
              <small>Login + scan QR</small>
            </span>
          </button>
        </aside>

        <div className="ws-wa-side-main">
          <label className="ws-wa-side-phone">
            <span>Business WhatsApp number</span>
            <input
              defaultValue={initialValues.businessPhone}
              name="businessPhone"
              placeholder="9685788980"
              type="text"
            />
          </label>

          {provider === "sheetomatic" ? (
            <div className="ws-wa-side-panel">
              <header className="ws-wa-side-panel-head">
                <h3>Official API</h3>
                <p>Use the API key and Phone ID from your WhatsApp Business account.</p>
              </header>
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
            </div>
          ) : (
            <div className="ws-wa-side-panel">
              <header className="ws-wa-side-panel-head">
                <h3>Web Based API</h3>
                <p>Save account credentials, then scan the QR code to link WhatsApp.</p>
              </header>
              <div className="ws-wa-side-web-grid">
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

                <MasWhatsAppConnectPanel
                  compact
                  credentialsSaved={masCredentialsSaved || settingsState.ok}
                  initialDashboard={masAccountDashboard}
                  initialStatus={masLinkStatus}
                />
              </div>
            </div>
          )}

          <div className="ws-wa-side-foot">
            <p className="ws-wa-settings-lead is-compact">
              {credentialsReady
                ? "Credentials saved. Leave secret fields blank to keep current values."
                : "Save to activate the selected connection type."}
            </p>
            <button
              className="btn-cta btn-primary"
              disabled={settingsPending}
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
        </div>
      </form>
    </section>
  );
}
