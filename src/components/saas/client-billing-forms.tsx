"use client";

import { useActionState } from "react";
import {
  generateClientInvoiceAction,
  recordClientPaymentAction,
  sendClientInvoiceAction,
  toggleOnboardingTaskAction,
  updateClientBillingAction,
  voidClientInvoiceAction,
  type BillingActionState,
} from "@/app/app/clients/actions";
import { paiseToRupees } from "@/lib/billing/money";

const initial: BillingActionState = { ok: false, message: "" };

function Result({ state }: { state: BillingActionState }) {
  if (!state.message) return null;
  return (
    <p className={state.ok ? "saas-form-success" : "saas-form-error"}>
      {state.message}
    </p>
  );
}

export function ClientBillingRatesForm({
  organizationId,
  monthlyRatePaise,
  extraUserMonthlyPaise,
  includedUsers,
  gstPercent,
  billingEmail,
  billingName,
  gstin,
  notes,
  billingPeriod,
  renewalAt,
}: {
  organizationId: string;
  monthlyRatePaise: number;
  extraUserMonthlyPaise: number;
  includedUsers: number;
  gstPercent: number;
  billingEmail: string;
  billingName: string;
  gstin: string;
  notes: string;
  billingPeriod: string;
  renewalAt: string;
}) {
  const [state, action, pending] = useActionState(updateClientBillingAction, initial);
  return (
    <form action={action} className="ws-billing-form">
      <input name="organizationId" type="hidden" value={organizationId} />
      <label>
        Monthly rate (₹, excl. GST)
        <input
          defaultValue={paiseToRupees(monthlyRatePaise) || ""}
          name="monthlyRate"
          required
        />
      </label>
      <label>
        Extra user / month (₹)
        <input
          defaultValue={paiseToRupees(extraUserMonthlyPaise) || ""}
          name="extraUserRate"
        />
      </label>
      <label>
        Included users
        <input defaultValue={includedUsers} min={0} name="includedUsers" type="number" />
      </label>
      <label>
        GST %
        <input defaultValue={gstPercent} max={40} min={0} name="gstPercent" type="number" />
      </label>
      <label>
        Billing period
        <select defaultValue={billingPeriod} name="billingPeriod">
          <option value="MONTHLY">Monthly</option>
          <option value="ANNUAL">Annual</option>
        </select>
      </label>
      <label>
        Renewal / last due date
        <input defaultValue={renewalAt} name="renewalAt" type="date" />
      </label>
      <label>
        Billing email
        <input defaultValue={billingEmail} name="billingEmail" type="email" />
      </label>
      <label>
        Bill-to name
        <input defaultValue={billingName} name="billingName" />
      </label>
      <label>
        GSTIN
        <input defaultValue={gstin} name="gstin" />
      </label>
      <label className="ws-billing-form-wide">
        Notes
        <textarea defaultValue={notes} name="notes" rows={2} />
      </label>
      <div className="ws-billing-form-wide ws-billing-actions">
        <button className="btn-cta btn-primary" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save billing"}
        </button>
      </div>
      <div className="ws-billing-form-wide">
        <Result state={state} />
      </div>
    </form>
  );
}

export function GenerateInvoiceForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState(generateClientInvoiceAction, initial);
  return (
    <form action={action} className="ws-billing-actions">
      <input name="organizationId" type="hidden" value={organizationId} />
      <label>
        <input defaultChecked name="prorate" type="checkbox" /> Prorata from today
      </label>
      <button className="btn-cta btn-primary" disabled={pending} type="submit">
        {pending ? "Generating…" : "Generate invoice"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function InvoiceOpsForm({
  organizationId,
  invoiceId,
  balanceRupees,
}: {
  organizationId: string;
  invoiceId: string;
  balanceRupees: number;
}) {
  const [sendState, sendAction, sending] = useActionState(sendClientInvoiceAction, initial);
  const [payState, payAction, paying] = useActionState(recordClientPaymentAction, initial);
  const [voidState, voidAction, voiding] = useActionState(voidClientInvoiceAction, initial);

  return (
    <div className="ws-billing-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <form action={sendAction} className="ws-billing-actions">
        <input name="invoiceId" type="hidden" value={invoiceId} />
        <button className="btn-cta" disabled={sending} type="submit">
          {sending ? "Sending…" : "Send invoice / reminder"}
        </button>
        <Result state={sendState} />
      </form>
      <form action={payAction} className="ws-billing-form">
        <input name="organizationId" type="hidden" value={organizationId} />
        <input name="invoiceId" type="hidden" value={invoiceId} />
        <label>
          Amount received (₹)
          <input defaultValue={balanceRupees || ""} name="amount" required />
        </label>
        <label>
          Method
          <select defaultValue="UPI" name="method">
            <option value="UPI">UPI</option>
            <option value="BANK">Bank</option>
            <option value="CASH">Cash</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label>
          UTR / reference
          <input name="reference" placeholder="PhonePe / bank UTR" />
        </label>
        <div className="ws-billing-form-wide ws-billing-actions">
          <button className="btn-cta btn-primary" disabled={paying} type="submit">
            {paying ? "Recording…" : "Collect payment"}
          </button>
        </div>
        <div className="ws-billing-form-wide">
          <Result state={payState} />
        </div>
      </form>
      <form action={voidAction}>
        <input name="organizationId" type="hidden" value={organizationId} />
        <input name="invoiceId" type="hidden" value={invoiceId} />
        <button className="saas-ws-action danger" disabled={voiding} type="submit">
          Void invoice
        </button>
        <Result state={voidState} />
      </form>
    </div>
  );
}

export function OnboardingChecklistForm({
  organizationId,
  tasks,
}: {
  organizationId: string;
  tasks: Array<{
    key: string;
    label: string;
    completedAt: Date | null;
  }>;
}) {
  const [state, action, pending] = useActionState(toggleOnboardingTaskAction, initial);
  return (
    <div>
      <ul className="ws-billing-check">
        {tasks.map((task) => {
          const done = Boolean(task.completedAt);
          return (
            <li className={done ? "done" : undefined} key={task.key}>
              <span>{task.label}</span>
              <form action={action}>
                <input name="organizationId" type="hidden" value={organizationId} />
                <input name="key" type="hidden" value={task.key} />
                <input name="completed" type="hidden" value={done ? "0" : "1"} />
                <button className="saas-ws-action" disabled={pending} type="submit">
                  {done ? "Reopen" : "Done"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
      <Result state={state} />
    </div>
  );
}
