"use client";

import { useActionState, useEffect } from "react";
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
import type { RedlavaResellerPhone } from "@/lib/integrations/redlava-reseller";

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
  credentialsSource,
  hasSavedSecrets,
  onClose,
  resellerPhones = [],
  resellerWalletPoints = null,
  embedded = false,
}: {
  initialValues: WhatsAppSettingsFormValues;
  members: WhatsAppMember[];
  credentialsSource: string;
  hasSavedSecrets: {
    redlavaApiKey: boolean;
  };
  onClose?: () => void;
  resellerPhones?: RedlavaResellerPhone[];
  resellerWalletPoints?: number | null;
  embedded?: boolean;
}) {
  const router = useRouter();
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

  return (
    <section className={`saas-panel ws-wa-settings-panel${embedded ? " is-embedded" : ""}`}>
      {!embedded ? (
        <header className="ws-wa-settings-head">
          <div>
            <h2>WhatsApp settings</h2>
            <p>
              Connect RedLava using your API key and Phone ID, then add WhatsApp
              numbers for team members who should receive messages.
            </p>
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
            Credentials source: <strong>{credentialsSource}</strong>.
            {resellerWalletPoints != null ? (
              <>
                {" "}
                Reseller wallet: <strong>{resellerWalletPoints.toLocaleString()}</strong>{" "}
                points.
              </>
            ) : null}
          </p>
          <p className="ws-wa-settings-lead">
            Use the <strong>Integration API key</strong> for sending and templates (
            <a
              href="https://wa.redlava.in/Integrations/ApiDocumentation"
              rel="noopener noreferrer"
              target="_blank"
            >
              Integrations docs
            </a>
            ). The <strong>Reseller API key</strong> is configured in server env for
            phone discovery (
            <a
              href="https://wa.redlava.in/ApiDocumentation"
              rel="noopener noreferrer"
              target="_blank"
            >
              Reseller docs
            </a>
            ).
          </p>

          <form action={settingsAction} className="ws-wa-settings-form">
            <label>
              Business WhatsApp number
              <input
                defaultValue={initialValues.businessPhone}
                name="businessPhone"
                placeholder="9685788980"
                type="text"
              />
            </label>

            <label>
              RedLava API key
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
              <span className="ws-field-hint">
                From wa.redlava.in - Integrations - API Keys (customer account, not
                reseller key). Leave blank to keep the current key.
              </span>
            </label>

            <label>
              RedLava Phone ID
              <input
                defaultValue={initialValues.redlavaPhoneId}
                list="redlava-phone-options"
                name="redlavaPhoneId"
                placeholder="1102997926228862"
                type="text"
              />
              {resellerPhones.length > 0 ? (
                <datalist id="redlava-phone-options">
                  {resellerPhones.map((phone) => (
                    <option
                      key={`${phone.customerId}-${phone.phoneNumberId}`}
                      value={phone.phoneNumberId}
                    >
                      {phone.displayPhoneNumber} ({phone.customerUsername})
                    </option>
                  ))}
                </datalist>
              ) : null}
              <span className="ws-field-hint">
                From Connected Account, or pick from the dropdown when your
                reseller key is configured on the server.
              </span>
            </label>

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
