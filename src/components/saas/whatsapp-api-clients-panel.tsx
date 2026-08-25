"use client";

import { useActionState, useState } from "react";
import {
  addWhatsAppApiClientAction,
  cancelWhatsAppApiClientAction,
  rechargeWhatsAppApiClientAction,
  remindWhatsAppApiClientAction,
  type BillingActionState,
} from "@/app/app/clients/actions";
import { CUSTOM_WHATSAPP_API_PLAN_ID } from "@/lib/billing/whatsapp-api-plans";
import type { WhatsAppApiClientRow } from "@/lib/billing/whatsapp-api-clients.shared";
import type { WhatsAppApiPlanOption } from "@/lib/billing/whatsapp-api-plans";

const initial: BillingActionState = { ok: false, message: "" };

function statusClass(value: string) {
  return value.toLowerCase().replace(/\s+/g, "_");
}

export function WhatsAppApiClientsPanel({
  clients,
  plans,
}: {
  clients: WhatsAppApiClientRow[];
  plans: WhatsAppApiPlanOption[];
}) {
  const [addState, addAction, adding] = useActionState(
    addWhatsAppApiClientAction,
    initial,
  );
  const [planId, setPlanId] = useState(plans[0]?.id ?? CUSTOM_WHATSAPP_API_PLAN_ID);
  const official = plans.filter((plan) => plan.kind === "OFFICIAL");
  const unofficial = plans.filter((plan) => plan.kind === "UNOFFICIAL");
  const dueSoon = clients.filter((row) => row.dueSoon).length;
  const expired = clients.filter((row) => row.status === "EXPIRED").length;

  return (
    <article className="saas-panel">
      <div className="saas-panel-head">
        <div>
          <h3>
            WhatsApp API{" "}
            <span className="ws-billing-pill">{clients.length}</span>
          </h3>
          <p>
            Recharge clients — Official or unofficial plans. We remind them on
            WhatsApp 7, 3, and 1 day before expiry, and on the due date.
            {dueSoon ? ` ${dueSoon} due in 7 days.` : ""}
            {expired ? ` ${expired} expired.` : ""}
          </p>
        </div>
      </div>

      <form action={addAction} className="ws-billing-form">
        <label>
          Client name
          <input name="name" required minLength={2} placeholder="Ramesh" />
        </label>
        <label>
          Company
          <input name="company" placeholder="Optional" />
        </label>
        <label>
          WhatsApp number
          <input name="phone" required placeholder="98765 43210" inputMode="tel" />
        </label>
        <label>
          Email
          <input name="email" type="email" placeholder="Optional, for email copy" />
        </label>
        <label className="ws-billing-form-wide">
          Plan
          <select
            name="planId"
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
          >
            <optgroup label="Official API">
              {official.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.label} · {plan.durationLabel}
                </option>
              ))}
            </optgroup>
            <optgroup label="Unofficial API recharge">
              {unofficial.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.label}
                </option>
              ))}
            </optgroup>
            <option value={CUSTOM_WHATSAPP_API_PLAN_ID}>Custom amount / days</option>
          </select>
        </label>
        {planId === CUSTOM_WHATSAPP_API_PLAN_ID ? (
          <>
            <label>
              Custom plan name
              <input name="customLabel" placeholder="e.g. 8,000 messages · 2 months" />
            </label>
            <label>
              Amount (₹)
              <input name="customAmount" inputMode="decimal" placeholder="2999" />
            </label>
            <label>
              Days
              <input name="customDurationDays" inputMode="numeric" placeholder="60" />
            </label>
            <label>
              API type
              <select name="planKind" defaultValue="UNOFFICIAL">
                <option value="OFFICIAL">Official API</option>
                <option value="UNOFFICIAL">Unofficial API</option>
              </select>
            </label>
          </>
        ) : null}
        <label>
          Plan start
          <input name="startedAt" type="date" />
        </label>
        <label className="ws-billing-form-wide">
          Notes
          <input name="notes" placeholder="Optional — WABA id, panel login, etc." />
        </label>
        <div className="ws-billing-actions ws-billing-form-wide">
          <button className="btn-cta" disabled={adding} type="submit">
            {adding ? "Saving…" : "Add WhatsApp API client"}
          </button>
          {addState.message ? (
            <span className={addState.ok ? "ws-billing-pill active" : "ws-billing-pill overdue"}>
              {addState.message}
            </span>
          ) : null}
        </div>
      </form>

      {clients.length === 0 ? (
        <p className="ws-wa-empty">
          No WhatsApp API clients yet. Add a number and plan to start recharge
          reminders.
        </p>
      ) : (
        <div className="ws-billing-table-wrap">
          <table className="ws-billing-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Recharge by</th>
                <th>Reminders</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    <div>
                      {row.phoneLabel}
                      {row.company ? ` · ${row.company}` : ""}
                      {row.email ? ` · ${row.email}` : ""}
                    </div>
                    <span className={`ws-billing-pill ${statusClass(row.status)}`}>
                      {row.status}
                    </span>{" "}
                    <span className="ws-billing-pill">{row.planKindLabel}</span>
                  </td>
                  <td>
                    {row.planLabel}
                    <div>{row.durationDays} days · started {row.startedLabel}</div>
                  </td>
                  <td>{row.amountLabel}</td>
                  <td>
                    {row.expiresLabel}
                    <div>{row.daysLeftLabel}</div>
                  </td>
                  <td>
                    <WhatsAppApiClientActions
                      clientId={row.id}
                      clientName={row.name}
                      reminderCount={row.reminderCount}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function WhatsAppApiClientActions({
  clientId,
  clientName,
  reminderCount,
}: {
  clientId: string;
  clientName: string;
  reminderCount: number;
}) {
  const [rechargeState, rechargeAction, recharging] = useActionState(
    rechargeWhatsAppApiClientAction,
    initial,
  );
  const [remindState, remindAction, reminding] = useActionState(
    remindWhatsAppApiClientAction,
    initial,
  );
  const [cancelState, cancelAction, cancelling] = useActionState(
    cancelWhatsAppApiClientAction,
    initial,
  );
  const message =
    rechargeState.message || remindState.message || cancelState.message;

  return (
    <div className="ws-plan-actions">
      <div className="ws-billing-actions">
        <form action={rechargeAction}>
          <input name="clientId" type="hidden" value={clientId} />
          <button className="saas-ws-action" disabled={recharging} type="submit">
            {recharging ? "Saving…" : "Recharged"}
          </button>
        </form>
        <form action={remindAction}>
          <input name="clientId" type="hidden" value={clientId} />
          <button className="saas-ws-action" disabled={reminding} type="submit">
            {reminding ? "Sending…" : "Remind now"}
          </button>
        </form>
        <form
          action={cancelAction}
          onSubmit={(event) => {
            if (!window.confirm(`Stop reminders for ${clientName}?`)) {
              event.preventDefault();
            }
          }}
        >
          <input name="clientId" type="hidden" value={clientId} />
          <button className="saas-ws-action danger" disabled={cancelling} type="submit">
            {cancelling ? "…" : "Cancel"}
          </button>
        </form>
      </div>
      <div>
        {reminderCount} sent
        {message ? ` · ${message}` : ""}
      </div>
    </div>
  );
}
