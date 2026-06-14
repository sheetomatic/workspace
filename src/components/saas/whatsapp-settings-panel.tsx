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

  return (
    <section className={`saas-panel ws-wa-settings-panel${embedded ? " is-embedded" : ""}`}>
      {!embedded ? (
        <header className="ws-wa-settings-head">
          <div>
            <h2>Settings</h2>
            <p>Choose how WhatsApp connects and save your credentials.</p>
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

      <div className="ws-wa-settings-grid">
        <article className="ws-wa-settings-card">
          <h3>Connection</h3>
          <p className="ws-wa-settings-lead">
            {credentialsReady
              ? "Credentials saved. Leave secret fields blank to keep current values."
              : "Choose Official API or Web Based API, then save your credentials."}
          </p>

          <div
            aria-label="WhatsApp connection type"
            className="ws-wa-provider-tabs"
            role="tablist"
          >
            <button
              aria-selected={provider === "sheetomatic"}
              className={`ws-wa-provider-tab${provider === "sheetomatic" ? " is-active" : ""}`}
              role="tab"
              type="button"
              onClick={() => setProvider("sheetomatic")}
            >
              <KeyRound aria-hidden size={16} />
              <span>
                <strong>Official API</strong>
                <small>Meta Cloud API key + Phone ID</small>
              </span>
            </button>
            <button
              aria-selected={provider === "messageautosender"}
              className={`ws-wa-provider-tab${provider === "messageautosender" ? " is-active" : ""}`}
              role="tab"
              type="button"
              onClick={() => setProvider("messageautosender")}
            >
              <Globe aria-hidden size={16} />
              <span>
                <strong>Web Based API</strong>
                <small>Scan QR to link your phone</small>
              </span>
            </button>
          </div>

          <form action={settingsAction} className="ws-wa-settings-form">
            <input name="whatsappProvider" type="hidden" value={provider} />

            <label>
              Business WhatsApp number
              <input
                defaultValue={initialValues.businessPhone}
                name="businessPhone"
                placeholder="9685788980"
                type="text"
              />
            </label>

            {provider === "messageautosender" ? (
              <div
                aria-labelledby="ws-wa-web-tab-label"
                className="ws-wa-provider-panel"
                role="tabpanel"
              >
                <p className="ws-wa-settings-lead is-compact" id="ws-wa-web-tab-label">
                  Sign in with your web account, save, then scan QR to link your
                  phone.
                </p>
                <label>
                  Username
                  <input
                    defaultValue={initialValues.masUsername}
                    name="masUsername"
                    placeholder="Your account username"
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
                        : "Your account password"
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
                        : "Paste API key from your web account"
                    }
                    type="password"
                    autoComplete="off"
                  />
                  <span className="ws-field-hint">
                    Used to send messages and load the QR dashboard after you save.
                  </span>
                </label>
              </div>
            ) : (
              <div
                aria-labelledby="ws-wa-official-tab-label"
                className="ws-wa-provider-panel"
                role="tabpanel"
              >
                <p className="ws-wa-settings-lead is-compact" id="ws-wa-official-tab-label">
                  Use the API key and Phone ID from your WhatsApp Business
                  connected account.
                </p>
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
            )}

            <button
              className="btn-cta btn-primary"
              disabled={settingsPending}
              type="submit"
            >
              {settingsPending ? "Saving..." : "Save connection"}
            </button>

            {settingsState.message ? (
              <p
                className={`saas-form-message ${settingsState.ok ? "ok" : "error"}`}
              >
                {settingsState.message}
              </p>
            ) : null}
          </form>

          {provider === "messageautosender" ? (
            <MasWhatsAppConnectPanel
              credentialsSaved={masCredentialsSaved || settingsState.ok}
              initialDashboard={masAccountDashboard}
              initialStatus={masLinkStatus}
            />
          ) : null}
        </article>
      </div>
    </section>
  );
}
