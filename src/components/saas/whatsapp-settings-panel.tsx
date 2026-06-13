"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, UserPlus, X } from "lucide-react";
import {
  saveWhatsAppSettings,
  updateMemberWhatsAppPhone,
} from "@/app/app/whatsapp/actions";
import { whatsAppTemplateInitialState } from "@/lib/whatsapp-template-types";
import type { WhatsAppSettingsFormValues } from "@/lib/whatsapp-settings-form";
import { maskSecret } from "@/lib/whatsapp-settings-form";
import { MasWhatsAppConnectPanel } from "@/components/saas/mas-whatsapp-connect-panel";
import type { MasPhoneConnectionStatus } from "@/lib/integrations/messageautosender";

type WhatsAppMember = {
  membershipId: string;
  name: string;
  email: string;
  phone: string | null;
  phoneFormatted: string | null;
  role: string;
};

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
  members,
  credentialsReady,
  hasSavedSecrets,
  masLinkStatus = null,
  onClose,
  embedded = false,
}: {
  initialValues: WhatsAppSettingsFormValues;
  members: WhatsAppMember[];
  credentialsReady: boolean;
  hasSavedSecrets: {
    redlavaApiKey: boolean;
    masPassword: boolean;
  };
  masLinkStatus?: MasPhoneConnectionStatus | null;
  onClose?: () => void;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState(initialValues.whatsappProvider);
  const [settingsState, settingsAction, settingsPending] = useActionState(
    saveWhatsAppSettings,
    whatsAppTemplateInitialState,
  );
  const [phoneState, phoneAction, phonePending] = useActionState(
    updateMemberWhatsAppPhone,
    whatsAppTemplateInitialState,
  );

  useEffect(() => {
    if (settingsState.ok) {
      router.refresh();
    }
  }, [settingsState, router]);

  useEffect(() => {
    if (phoneState.ok) {
      router.refresh();
    }
  }, [phoneState, router]);

  const missingPhone = members.filter((member) => !member.phone);
  const readyCount = members.length - missingPhone.length;
  const masCredentialsSaved =
    hasSavedSecrets.masPassword && Boolean(initialValues.masUsername);

  return (
    <section className={`saas-panel ws-wa-settings-panel${embedded ? " is-embedded" : ""}`}>
      {!embedded ? (
        <header className="ws-wa-settings-head">
          <div>
            <h2>Settings</h2>
            <p>Choose how WhatsApp connects, save credentials, and add team numbers.</p>
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
          <h3>Provider</h3>
          <p className="ws-wa-settings-lead">
            {credentialsReady
              ? "Credentials saved. Leave secret fields blank to keep current values."
              : "Pick a connection type and enter the credentials you received."}
          </p>

          <form action={settingsAction} className="ws-wa-settings-form">
            <label>
              Connection type
              <select
                name="whatsappProvider"
                value={provider}
                onChange={(event) =>
                  setProvider(
                    event.target.value === "messageautosender"
                      ? "messageautosender"
                      : "sheetomatic",
                  )
                }
              >
                <option value="sheetomatic">WhatsApp API</option>
                <option value="messageautosender">WhatsApp Link</option>
              </select>
              <span className="ws-field-hint">
                API = official Meta messaging. Link = connect your phone with QR or OTP.
              </span>
            </label>

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
              <>
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
              </>
            ) : (
              <>
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
                  <span className="ws-field-hint">
                    From your WhatsApp API connected account.
                  </span>
                </label>
              </>
            )}

            <button
              className="btn-cta btn-primary"
              disabled={settingsPending}
              type="submit"
            >
              {settingsPending ? "Saving..." : "Save"}
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
              credentialsSaved={masCredentialsSaved}
              initialStatus={masLinkStatus}
            />
          ) : null}
        </article>

        <article className="ws-wa-settings-card">
          <h3>Add users for WhatsApp</h3>
          <p className="ws-wa-settings-lead">
            {readyCount} of {members.length} members have a WhatsApp number.
            {missingPhone.length > 0
              ? ` Add numbers for the ${missingPhone.length} remaining below.`
              : " Everyone is ready to receive messages."}
          </p>

          {missingPhone.length > 0 ? (
            <ul className="ws-wa-member-add-list">
              {missingPhone.map((member) => (
                <li key={member.membershipId}>
                  <form action={phoneAction} className="ws-wa-member-add-row">
                    <input
                      name="membershipId"
                      type="hidden"
                      value={member.membershipId}
                    />
                    <div className="ws-wa-member-add-meta">
                      <strong>{member.name}</strong>
                      <span>{member.email}</span>
                      <span className="ws-wa-member-role">{member.role}</span>
                    </div>
                    <label>
                      WhatsApp number
                      <input
                        name="whatsapp"
                        placeholder="9685788980"
                        required
                        type="tel"
                      />
                    </label>
                    <button
                      className="btn-cta btn-secondary"
                      disabled={phonePending}
                      type="submit"
                    >
                      <UserPlus size={15} aria-hidden />
                      Add
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ws-wa-settings-done">
              All workspace members have WhatsApp numbers on file.
            </div>
          )}

          {phoneState.message ? (
            <p className={`saas-form-message ${phoneState.ok ? "ok" : "error"}`}>
              {phoneState.message}
            </p>
          ) : null}

          <p className="ws-wa-settings-foot">
            Need to invite someone new?{" "}
            <Link href="/app/team">Add them on the Team page</Link> with their
            WhatsApp number.
          </p>
        </article>
      </div>
    </section>
  );
}
