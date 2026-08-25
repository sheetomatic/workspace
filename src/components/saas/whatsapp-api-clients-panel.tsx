"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import { Bell, BellOff, Check, ChevronDown, Loader2 } from "lucide-react";
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
        <summary className="ws-wa-group-summary">
          <span>
            <ChevronDown className="ws-wa-chevron" size={16} aria-hidden />
            Add client
          </span>
          <small>New recharge client</small>
        </summary>
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
          <ChevronDown className="ws-wa-chevron" size={16} aria-hidden />
          {title} <span className="ws-billing-pill">{rows.length}</span>
        </span>
        <small>{hint}</small>
      </summary>
      {rows.length === 0 ? (
        <p className="ws-wa-empty">No {title.toLowerCase()} clients.</p>
      ) : (
        <ul className="crm-client-groups-list">
          {rows.map((row) => (
            <WhatsAppApiClientCard key={row.id} row={row} />
          ))}
        </ul>
      )}
    </details>
  );
}

function WhatsAppApiClientCard({ row }: { row: WhatsAppApiClientRow }) {
  const [open, setOpen] = useState(false);

  return (
    <li className={`crm-client-card${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="crm-client-head"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="crm-client-avatar" aria-hidden>
          {(row.name.trim()[0] || "?").toUpperCase()}
        </span>
        <span className="crm-client-copy">
          <strong>{row.name}</strong>
          <span>
            {row.phoneLabel}
            {row.company ? ` · ${row.company}` : ""}
          </span>
          <span className="crm-client-meta">
            {row.planLabel} · {row.daysLeftLabel} ·{" "}
            {row.creditPoints.toLocaleString("en-IN")} credits
          </span>
        </span>
        <span className={`ws-billing-pill ${statusClass(row.status)}`}>
          {row.status}
        </span>
        <ChevronDown className="crm-client-chevron" size={18} aria-hidden />
      </button>
      {open ? (
        <div className="crm-client-body">
          <dl className="ws-wa-detail">
            <div>
              <dt>Plan</dt>
              <dd>
                {row.planLabel}
                <div>{row.durationDays} days</div>
              </dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{row.amountLabel}</dd>
            </div>
            <div>
              <dt>Credits</dt>
              <dd>{row.creditPoints.toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt>API</dt>
              <dd>{row.planKindLabel}</dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{row.startedLabel}</dd>
            </div>
            <div>
              <dt>Recharge by</dt>
              <dd>
                {row.expiresLabel}
                <div>{row.daysLeftLabel}</div>
              </dd>
            </div>
            {row.email ? (
              <div>
                <dt>Email</dt>
                <dd>{row.email}</dd>
              </div>
            ) : null}
            {row.externalId ? (
              <div>
                <dt>Panel id</dt>
                <dd>{row.externalId}</dd>
              </div>
            ) : null}
            {row.notes ? (
              <div className="ws-wa-notes">
                <dt>Notes</dt>
                <dd>{row.notes}</dd>
              </div>
            ) : null}
          </dl>
          <WhatsAppApiClientActions
            clientId={row.id}
            clientName={row.name}
            reminderCount={row.reminderCount}
            canRemind={row.accountGroup === "REGULAR"}
          />
        </div>
      ) : null}
    </li>
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
      <div className="ws-wa-row-actions">
        <form action={planAction} className="ws-wa-plan-box">
          <input name="clientId" type="hidden" value={clientId} />
          <label>
            Days
            <input name="days" type="number" min={1} max={1095} placeholder="30" />
          </label>
          <label>
            Credits
            <input
              name="credits"
              type="number"
              min={1}
              max={1000000}
              placeholder="4000"
            />
          </label>
          <button
            className={`ws-billing-icon-btn${applying ? " is-busy" : ""}`}
            disabled={applying}
            type="submit"
            title="Save days and credits"
            aria-label="Save days and credits"
          >
            {applying ? (
              <Loader2 size={16} aria-hidden />
            ) : (
              <Check size={16} aria-hidden />
            )}
          </button>
        </form>
        <div className="ws-wa-icon-row">
          {canRemind ? (
            <form action={remindAction}>
              <input name="clientId" type="hidden" value={clientId} />
              <button
                className={`ws-billing-icon-btn${reminding ? " is-busy" : ""}`}
                disabled={reminding}
                type="submit"
                title="Send reminder now"
                aria-label="Send reminder now"
              >
                {reminding ? (
                  <Loader2 size={16} aria-hidden />
                ) : (
                  <Bell size={16} aria-hidden />
                )}
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
            <button
              className={`ws-billing-icon-btn danger${cancelling ? " is-busy" : ""}`}
              disabled={cancelling}
              type="submit"
              title="Stop reminders"
              aria-label="Stop reminders"
            >
              {cancelling ? (
                <Loader2 size={16} aria-hidden />
              ) : (
                <BellOff size={16} aria-hidden />
              )}
            </button>
          </form>
        </div>
      </div>
      <div className="crm-client-meta">
        {reminderCount} reminder{reminderCount === 1 ? "" : "s"} sent
        {message ? ` · ${message}` : ""}
      </div>
    </div>
  );
}
