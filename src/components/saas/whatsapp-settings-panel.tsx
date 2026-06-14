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
            <p>Configure Official API or Web Based API side by side.</p>
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

      <form action={settingsAction} className="ws-wa-dual-connect-form">
        <input name="whatsappProvider" type="hidden" value={provider} />

        <div className="ws-wa-dual-connect-top">
          <label className="ws-wa-dual-phone">
            <span>Business WhatsApp number</span>
            <input
              defaultValue={initialValues.businessPhone}
              name="businessPhone"
              placeholder="9685788980"
              type="text"
            />
          </label>

          <fieldset className="ws-wa-active-provider">
            <legend>Active connection</legend>
            <label
              className={`ws-wa-active-option${provider === "sheetomatic" ? " is-active" : ""}`}
            >
              <input
                checked={provider === "sheetomatic"}
                name="whatsappProviderRadio"
                type="radio"
                value="sheetomatic"
                onChange={() => setProvider("sheetomatic")}
              />
              Official API
            </label>
            <label
              className={`ws-wa-active-option${provider === "messageautosender" ? " is-active" : ""}`}
            >
              <input
                checked={provider === "messageautosender"}
                name="whatsappProviderRadio"
                type="radio"
                value="messageautosender"
                onChange={() => setProvider("messageautosender")}
              />
              Web Based API
            </label>
          </fieldset>
        </div>

        <div className="ws-wa-dual-connect-grid">
          <article
            className={`ws-wa-dual-column ws-wa-dual-official${provider === "sheetomatic" ? " is-selected" : ""}`}
          >
            <header className="ws-wa-dual-column-head">
              <KeyRound size={16} aria-hidden />
              <div>
                <h3>Official API</h3>
                <p>Meta Cloud API key + Phone ID</p>
              </div>
            </header>
            <div className="ws-wa-dual-fields">
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
          </article>

          <article
            className={`ws-wa-dual-column ws-wa-dual-web${provider === "messageautosender" ? " is-selected" : ""}`}
          >
            <header className="ws-wa-dual-column-head">
              <Globe size={16} aria-hidden />
              <div>
                <h3>Web Based API</h3>
                <p>Account login + scan QR</p>
              </div>
            </header>
            <div className="ws-wa-dual-web-body">
              <div className="ws-wa-dual-fields">
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
          </article>
        </div>

        <div className="ws-wa-dual-connect-foot">
          <p className="ws-wa-settings-lead is-compact">
            {credentialsReady
              ? "Credentials saved. Leave secret fields blank to keep current values."
              : "Fill either column and choose which connection is active."}
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
      </form>
    </section>
  );
}
