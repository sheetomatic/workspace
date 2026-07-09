"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveLeadsWebBasedApiSettings } from "@/app/app/leads/actions";
import { maskSecret } from "@/lib/whatsapp-settings-form";

type ActionState = { ok: boolean; message: string };

const initialState: ActionState = { ok: false, message: "" };

export type LeadsWebBasedApiSettingsProps = {
  masUsername: string;
  businessPhone: string;
  hasSavedPassword: boolean;
  hasSavedApiKey: boolean;
  credentialsConfigured: boolean;
  webBasedApiEnabled: boolean;
};

export function LeadsWebBasedApiSettingsPanel({
  masUsername,
  businessPhone,
  hasSavedPassword,
  hasSavedApiKey,
  credentialsConfigured,
  webBasedApiEnabled,
}: LeadsWebBasedApiSettingsProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveLeadsWebBasedApiSettings,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <section className="saas-panel leads-settings-card" id="web-based-api">
      <div className="leads-settings-card-head">
        <div>
          <h3>Lead nurture — Web Based API</h3>
          <p className="leads-machine-muted">
            WhatsApp welcome, assignment, and follow-up messages use your Web Based
            API account. Save username, password, and API key from your provider
            portal.
          </p>
        </div>
        <span
          className={`leads-wba-status-pill${credentialsConfigured ? " is-ready" : ""}`}
        >
          {credentialsConfigured ? "Credentials saved" : "Not configured"}
        </span>
      </div>

      {!webBasedApiEnabled ? (
        <p className="leads-settings-notice is-error">
          Web Based API sending is disabled in this environment. Ask your admin to
          set <code>NEXT_PUBLIC_ENABLE_WEB_BASED_API=true</code> on production after
          credentials are saved.
        </p>
      ) : null}

      <form action={formAction} className="leads-wba-form">
        <label className="leads-settings-field">
          <span>Business WhatsApp number</span>
          <input
            defaultValue={businessPhone}
            name="businessPhone"
            placeholder="9329103106"
            type="text"
            autoComplete="tel"
          />
          <small className="leads-machine-muted">
            The number linked on your Web Based API portal (for your reference).
          </small>
        </label>

        <label className="leads-settings-field">
          <span>Username</span>
          <input
            defaultValue={masUsername}
            name="masUsername"
            placeholder="Web Based API account username"
            type="text"
            autoComplete="username"
            required
          />
        </label>

        <label className="leads-settings-field">
          <span>Password</span>
          <input
            name="masPassword"
            placeholder={
              hasSavedPassword ? maskSecret("saved-secret-key") : "Account password"
            }
            type="password"
            autoComplete="current-password"
          />
          <small className="leads-machine-muted">
            {hasSavedPassword
              ? "Leave blank to keep the saved password."
              : "Required on first save."}
          </small>
        </label>

        <label className="leads-settings-field">
          <span>API key</span>
          <input
            name="masApiKey"
            placeholder={
              hasSavedApiKey ? maskSecret("saved-secret-key") : "API key from portal"
            }
            type="password"
            autoComplete="off"
          />
          <small className="leads-machine-muted">
            {hasSavedApiKey
              ? "Leave blank to keep the saved API key."
              : "Required on first save."}
          </small>
        </label>

        <div className="leads-wba-form-foot">
          <button className="btn-primary" disabled={pending} type="submit">
            {pending ? "Saving…" : "Save Web Based API credentials"}
          </button>
        </div>

        {state.message ? (
          <p className={`leads-settings-notice is-${state.ok ? "success" : "error"}`}>
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
