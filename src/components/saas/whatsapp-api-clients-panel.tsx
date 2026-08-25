"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addWhatsAppApiClientAction,
  applyWhatsAppApiClientPlanAction,
  cancelWhatsAppApiClientAction,
  importWhatsAppApiClientsAction,
  remindWhatsAppApiClientAction,
  syncWhatsAppApiClientsFromPanelAction,
  type BillingActionState,
} from "@/app/app/clients/actions";
import { CUSTOM_WHATSAPP_API_PLAN_ID } from "@/lib/billing/whatsapp-api-plans";
import { whatsAppApiClientCsvTemplate } from "@/lib/billing/whatsapp-api-import-template";
import type { WhatsAppApiClientRow } from "@/lib/billing/whatsapp-api-clients.shared";
import type { WhatsAppApiPlanOption } from "@/lib/billing/whatsapp-api-plans";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import "@/components/saas/crm-client-groups.css";

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
  const [phoneDraft, setPhoneDraft] = useState("");
  const [query, setQuery] = useState("");
  const official = plans.filter((plan) => plan.kind === "OFFICIAL");
  const unofficial = plans.filter((plan) => plan.kind === "UNOFFICIAL");
  const phoneMatch = (() => {
    const normalized = normalizeWhatsAppPhone(phoneDraft);
    if (!normalized) return null;
    return (
      clients.find((row) => normalizeWhatsAppPhone(row.phone) === normalized) ?? null
    );
  })();
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = query.replace(/\D/g, "");
    if (!q) return clients;
    return clients.filter((row) => {
      const haystack = [
        row.name,
        row.company,
        row.email,
        row.phone,
        row.phoneLabel,
        row.planLabel,
        row.notes,
        row.externalId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (haystack.includes(q)) return true;
      return Boolean(digits && row.phone.replace(/\D/g, "").includes(digits));
    });
  }, [clients, query]);
  const regular = visible.filter((row) => row.accountGroup === "REGULAR");
  const inactive = visible.filter((row) => row.accountGroup === "INACTIVE");
  const searching = Boolean(query.trim());
  const totalRegular = clients.filter((row) => row.accountGroup === "REGULAR");
  const dueSoon = totalRegular.filter((row) => row.dueSoon).length;
  const expired = totalRegular.filter((row) => row.status === "EXPIRED").length;
  const inactiveTotal = clients.filter((row) => row.accountGroup === "INACTIVE").length;

  return (
    <article className="saas-panel">
      <div className="saas-panel-head">
        <div>
          <h3>
            WhatsApp API{" "}
            <span className="ws-billing-pill">{totalRegular.length}</span>
          </h3>
          <p>
            Regular clients get auto WhatsApp reminders 10, 7, 3, and 1 day
            before expiry. Click a group to expand it.
            {dueSoon ? ` ${dueSoon} due in 10 days.` : ""}
            {expired ? ` ${expired} expired.` : ""}
            {inactiveTotal ? ` ${inactiveTotal} inactive.` : ""}
          </p>
        </div>
        <WhatsAppApiClientUpload />
      </div>

      {clients.length > 0 ? (
        <div className="crm-client-groups-toolbar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter clients…"
            aria-label="Filter WhatsApp API customers"
          />
          <div className="crm-client-groups-toolbar-meta">
            <span className="crm-client-groups-count">
              {searching
                ? `${visible.length} match${visible.length === 1 ? "" : "es"} of ${clients.length}`
                : `${clients.length} client${clients.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      ) : null}

      <details className="ws-wa-add">
        <summary>Add client</summary>
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
          <input
            name="phone"
            required
            placeholder="98765 43210"
            inputMode="tel"
            value={phoneDraft}
            onChange={(event) => setPhoneDraft(event.target.value)}
          />
          {phoneMatch ? (
            <small className="ws-wa-phone-match">
              Matches {phoneMatch.name}
              {phoneMatch.company ? ` · ${phoneMatch.company}` : ""} — save
              updates this client, not a new row.
            </small>
          ) : null}
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
              Starting credits
              <input name="credits" inputMode="numeric" placeholder="4000" />
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
            {adding
              ? "Saving…"
              : phoneMatch
                ? "Save to existing client"
                : "Add WhatsApp API client"}
          </button>
          {addState.message ? (
            <span className={addState.ok ? "ws-billing-pill active" : "ws-billing-pill overdue"}>
              {addState.message}
            </span>
          ) : null}
        </div>
      </form>
      </details>

      {clients.length === 0 ? (
        <p className="ws-wa-empty">
          No WhatsApp API clients yet. Add a number and plan, or upload the
          panel customer list.
        </p>
      ) : (
        <div className="ws-wa-groups">
          {searching && visible.length === 0 ? (
            <p className="ws-wa-empty">No customer matches that search.</p>
          ) : (
            <>
              {!searching || regular.length > 0 ? (
                <WhatsAppApiClientGroup
                  title="Regular"
                  hint="Active clients — reminders are on"
                  rows={regular}
                  defaultOpen
                />
              ) : null}
              {!searching || inactive.length > 0 ? (
                <WhatsAppApiClientGroup
                  title="Inactive"
                  hint="Rest of the list — no reminders"
                  rows={inactive}
                  defaultOpen={searching}
                />
              ) : null}
            </>
          )}
        </div>
      )}
    </article>
  );
}

function WhatsAppApiClientGroup({
  title,
  hint,
  rows,
  defaultOpen = false,
}: {
  title: string;
  hint: string;
  rows: WhatsAppApiClientRow[];
  defaultOpen?: boolean;
}) {
  return (
    <details className="ws-wa-group" open={defaultOpen}>
      <summary className="ws-wa-group-summary">
        <span>
          {title} <span className="ws-billing-pill">{rows.length}</span>
        </span>
        <small>{hint}</small>
      </summary>
      {rows.length === 0 ? (
        <p className="ws-wa-empty">No {title.toLowerCase()} clients.</p>
      ) : (
        <div className="ws-billing-table-wrap">
          <table className="ws-billing-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Credits</th>
                <th>Recharge by</th>
                <th>Reminders</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
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
                    <div>
                      {row.durationDays} days · started {row.startedLabel}
                    </div>
                  </td>
                  <td>{row.amountLabel}</td>
                  <td>{row.creditPoints.toLocaleString("en-IN")}</td>
                  <td>
                    {row.expiresLabel}
                    <div>{row.daysLeftLabel}</div>
                  </td>
                  <td>
                    <WhatsAppApiClientActions
                      clientId={row.id}
                      clientName={row.name}
                      reminderCount={row.reminderCount}
                      canRemind={row.accountGroup === "REGULAR"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}

function WhatsAppApiClientUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function downloadTemplate() {
    const blob = new Blob([whatsAppApiClientCsvTemplate()], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "whatsapp-api-clients-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ws-wa-upload">
      <div className="ws-billing-actions">
        <button className="saas-ws-action" type="button" onClick={downloadTemplate}>
          Download template
        </button>
        <button
          className="btn-cta"
          disabled={pending}
          type="button"
          onClick={() => {
            setMessage(null);
            setError(null);
            startTransition(async () => {
              const result = await syncWhatsAppApiClientsFromPanelAction();
              if (!result.ok) {
                setError(result.message);
                return;
              }
              setMessage(result.message);
              router.refresh();
            });
          }}
        >
          {pending ? "Syncing…" : "Sync from panel"}
        </button>
        <button
          className="saas-ws-action"
          disabled={pending}
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          Upload file
        </button>
        <input
          ref={inputRef}
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setMessage(null);
            setError(null);
            const formData = new FormData();
            formData.set("file", file);
            startTransition(async () => {
              const result = await importWhatsAppApiClientsAction(formData);
              if (!result.ok) {
                setError(result.message);
                return;
              }
              setMessage(result.message);
              router.refresh();
            });
          }}
        />
      </div>
      <p className="ws-wa-upload-hint">
        Sync pulls every customer from the Web Based API panel. Same WhatsApp
        number merges; a new number is added. Recharge and credits write back
        to the panel.
      </p>
      {message ? <span className="ws-billing-pill active">{message}</span> : null}
      {error ? <span className="ws-billing-pill overdue">{error}</span> : null}
    </div>
  );
}

function WhatsAppApiClientActions({
  clientId,
  clientName,
  reminderCount,
  canRemind,
}: {
  clientId: string;
  clientName: string;
  reminderCount: number;
  canRemind: boolean;
}) {
  const [planState, planAction, applying] = useActionState(
    applyWhatsAppApiClientPlanAction,
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
    planState.message || remindState.message || cancelState.message;

  return (
    <div className="ws-plan-actions">
      <form action={planAction} className="ws-wa-plan-box">
        <input name="clientId" type="hidden" value={clientId} />
        <label>
          Days
          <input name="days" type="number" min={1} max={1095} placeholder="30" />
        </label>
        <label>
          Credits
          <input name="credits" type="number" min={1} max={1000000} placeholder="4000" />
        </label>
        <button className="btn-cta btn-sm" disabled={applying} type="submit">
          {applying ? "Saving…" : "Save plan"}
        </button>
      </form>
      <div className="ws-billing-actions">
        {canRemind ? (
          <form action={remindAction}>
            <input name="clientId" type="hidden" value={clientId} />
            <button className="saas-ws-action" disabled={reminding} type="submit">
              {reminding ? "Sending…" : "Remind now"}
            </button>
          </form>
        ) : null}
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
