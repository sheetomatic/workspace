"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveLeadsNurtureSettings } from "@/app/app/leads/actions";
import {
  ALERT_EVENT_ORDER,
  NURTURE_TEMPLATE_PLACEHOLDERS,
  NURTURE_EVENT_ORDER,
  type LeadNurtureOrgConfig,
} from "@/lib/leads/nurture/config";
import { LEAD_NURTURE_EVENT_LABELS } from "@/lib/leads/nurture/templates";

type ActionState = { ok: boolean; message: string };

const LIFECYCLE_EVENTS = NURTURE_EVENT_ORDER.filter(
  (id) => !id.startsWith("alert_"),
);

export function LeadsNurtureMessagesPanel({
  config,
  sendingActive,
}: {
  config: LeadNurtureOrgConfig;
  sendingActive: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveLeadsNurtureSettings, {
    ok: false,
    message: "",
  } satisfies ActionState);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <section className="saas-panel leads-settings-card" id="nurture-messages">
      <div className="leads-settings-card-head">
        <div>
          <h3>Nurture + Alert messages</h3>
          <p className="leads-machine-muted">
            Lifecycle nurture steps and commercial alerts (payment not received,
            quotation pending, negotiation). Placeholders fill from the lead when
            WhatsApp sends.
          </p>
        </div>
        <span
          className={`leads-wba-status-pill${sendingActive ? " is-ready" : ""}`}
        >
          {sendingActive ? "Sending active" : "Paused or not ready"}
        </span>
      </div>

      <form action={formAction} className="leads-nurture-form">
        <label className="leads-settings-field leads-nurture-toggle">
          <input
            defaultChecked={config.enabled}
            name="nurtureEnabled"
            type="checkbox"
            value="true"
          />
          <span>Enable automatic nurture + commercial alert WhatsApp messages</span>
        </label>

        <label className="leads-settings-field">
          <span>Minimum hours between stage / alert messages</span>
          <input
            defaultValue={String(config.stageMinGapHours)}
            max={168}
            min={0}
            name="stageMinGapHours"
            type="number"
          />
          <small className="leads-machine-muted">
            Avoids stacking WhatsApp texts too closely (default 48h).
          </small>
        </label>

        <fieldset className="leads-alert-rules">
          <legend>Alert center rules</legend>
          <p className="leads-machine-muted">
            Alerts appear in CRM Alert Center and auto-send when the wait period
            elapses (requires Web Based API + nurture enabled).
          </p>

          <label className="leads-settings-field leads-nurture-toggle">
            <input
              defaultChecked={config.alerts.paymentNotReceived.enabled}
              name="alert_paymentNotReceived_enabled"
              type="checkbox"
              value="true"
            />
            <span>Payment not received</span>
          </label>
          <label className="leads-settings-field">
            <span>Days after invoice before payment alert</span>
            <input
              defaultValue={String(config.alerts.paymentNotReceived.afterDays)}
              max={90}
              min={1}
              name="alert_paymentNotReceived_days"
              type="number"
            />
          </label>

          <label className="leads-settings-field leads-nurture-toggle">
            <input
              defaultChecked={config.alerts.quotationNotAccepted.enabled}
              name="alert_quotationNotAccepted_enabled"
              type="checkbox"
              value="true"
            />
            <span>Quotation not accepted yet</span>
          </label>
          <label className="leads-settings-field">
            <span>Days after quotation sent</span>
            <input
              defaultValue={String(config.alerts.quotationNotAccepted.afterDays)}
              max={90}
              min={1}
              name="alert_quotationNotAccepted_days"
              type="number"
            />
          </label>

          <label className="leads-settings-field leads-nurture-toggle">
            <input
              defaultChecked={config.alerts.negotiationFollowUp.enabled}
              name="alert_negotiationFollowUp_enabled"
              type="checkbox"
              value="true"
            />
            <span>Negotiation follow-up</span>
          </label>
          <label className="leads-settings-field">
            <span>Days in negotiation without update</span>
            <input
              defaultValue={String(config.alerts.negotiationFollowUp.afterDays)}
              max={90}
              min={1}
              name="alert_negotiationFollowUp_days"
              type="number"
            />
          </label>
        </fieldset>

        <details className="leads-nurture-placeholders">
          <summary>Placeholder reference</summary>
          <ul className="leads-nurture-placeholder-list">
            {NURTURE_TEMPLATE_PLACEHOLDERS.map((item) => (
              <li key={item.key}>
                <code>{item.key}</code> — {item.label}
              </li>
            ))}
          </ul>
        </details>

        <div className="leads-nurture-templates">
          <h4 className="leads-nurture-section-title">Lifecycle messages</h4>
          {LIFECYCLE_EVENTS.map((eventId) => (
            <label key={eventId} className="leads-settings-field">
              <span>{LEAD_NURTURE_EVENT_LABELS[eventId]}</span>
              <textarea
                defaultValue={config.templates[eventId] ?? ""}
                name={`template_${eventId}`}
                rows={7}
                spellCheck={false}
              />
            </label>
          ))}

          <h4 className="leads-nurture-section-title">Default AI alert messages</h4>
          {ALERT_EVENT_ORDER.map((eventId) => (
            <label key={eventId} className="leads-settings-field">
              <span>{LEAD_NURTURE_EVENT_LABELS[eventId]}</span>
              <textarea
                defaultValue={config.templates[eventId] ?? ""}
                name={`template_${eventId}`}
                rows={7}
                spellCheck={false}
              />
            </label>
          ))}
        </div>

        <div className="leads-wba-form-foot">
          <button className="btn-primary" disabled={pending} type="submit">
            {pending ? "Saving…" : "Save nurture + alert messages"}
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
