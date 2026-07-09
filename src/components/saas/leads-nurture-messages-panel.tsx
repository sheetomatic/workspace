"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveLeadsNurtureSettings } from "@/app/app/leads/actions";
import {
  NURTURE_TEMPLATE_PLACEHOLDERS,
  NURTURE_EVENT_ORDER,
  type LeadNurtureOrgConfig,
} from "@/lib/leads/nurture/config";
import { LEAD_NURTURE_EVENT_LABELS } from "@/lib/leads/nurture/templates";

const EVENT_ORDER = NURTURE_EVENT_ORDER;

type ActionState = { ok: boolean; message: string };

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
          <h3>Nurture messages</h3>
          <p className="leads-machine-muted">
            Customise WhatsApp text for each step. Use placeholders — they fill in
            from the lead record when a message sends.
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
          <span>Enable automatic nurture WhatsApp messages</span>
        </label>

        <label className="leads-settings-field">
          <span>Minimum hours between stage messages</span>
          <input
            defaultValue={String(config.stageMinGapHours)}
            max={168}
            min={0}
            name="stageMinGapHours"
            type="number"
          />
          <small className="leads-machine-muted">
            Avoids sending meeting / proposal / follow-up texts too close together
            (default 48h).
          </small>
        </label>

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
          {EVENT_ORDER.map((eventId) => (
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
            {pending ? "Saving…" : "Save nurture messages"}
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
