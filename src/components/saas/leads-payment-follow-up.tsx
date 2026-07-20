"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  removePaymentFollowUpClient,
  sendLeadNurtureWhatsAppAction,
  upsertPaymentFollowUpClient,
} from "@/app/app/leads/actions";
import {
  formatPaymentAmount,
  formatPaymentDateLabel,
  type PaymentFollowUpClient,
} from "@/lib/leads/payment-follow-up";

type Props = {
  canManage: boolean;
  clients: PaymentFollowUpClient[];
};

function todayInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function LeadsPaymentFollowUp({ canManage, clients }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const totals = useMemo(() => {
    return clients.reduce(
      (acc, row) => {
        acc.total += row.paymentTotal;
        acc.received += row.paymentReceived;
        acc.due += row.paymentDue;
        return acc;
      },
      { total: 0, received: 0, due: 0 },
    );
  }, [clients]);

  function refresh() {
    router.refresh();
  }

  function onAdd(formData: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await upsertPaymentFollowUpClient(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage("Client added to Payment Follow-up.");
      refresh();
    });
  }

  function onSendWa(leadId: string) {
    setMessage(null);
    setError(null);
    setSendingId(leadId);
    startTransition(async () => {
      const result = await sendLeadNurtureWhatsAppAction(
        leadId,
        "alert_payment_pending",
      );
      setSendingId(null);
      if (!result.ok) {
        setError(result.message ?? "WhatsApp send failed.");
        return;
      }
      setMessage("Payment follow-up WhatsApp sent from portal.");
      refresh();
    });
  }

  function onRemove(leadId: string) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await removePaymentFollowUpClient(leadId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage("Removed from Payment Follow-up.");
      refresh();
    });
  }

  return (
    <section className="leads-payment-fu" aria-label="Payment Follow-up">
      <header className="leads-payment-fu__header">
        <div>
          <h2>Payment Follow-up</h2>
          <p>
            Add clients with Total / Received / Due / Last date. Portal AI sends
            WhatsApp with these amounts (Web Based API).
          </p>
        </div>
        <div className="leads-payment-fu__kpis" aria-label="Collection totals">
          <span>
            Total <strong>{formatPaymentAmount(totals.total)}</strong>
          </span>
          <span>
            Received <strong>{formatPaymentAmount(totals.received)}</strong>
          </span>
          <span>
            Due <strong>{formatPaymentAmount(totals.due)}</strong>
          </span>
        </div>
      </header>

      {canManage ? (
        <form action={onAdd} className="leads-payment-fu__form">
          <label>
            Client name
            <input name="name" type="text" placeholder="Name" required />
          </label>
          <label>
            WhatsApp / phone
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder="91XXXXXXXXXX"
              required
            />
          </label>
          <label>
            Company
            <input name="company" type="text" placeholder="Company (optional)" />
          </label>
          <label>
            Total Payment
            <input
              name="paymentTotal"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              required
            />
          </label>
          <label>
            Received Payment
            <input
              name="paymentReceived"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              required
            />
          </label>
          <label>
            Last Date of Payment
            <input
              name="paymentLastDate"
              type="date"
              defaultValue={todayInputValue()}
              required
            />
          </label>
          <div className="leads-payment-fu__form-actions">
            <p className="leads-machine-muted">
              Due Payment is calculated as Total − Received.
            </p>
            <button
              type="submit"
              className="btn-primary"
              disabled={pending}
            >
              {pending ? "Saving…" : "Add client"}
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="leads-payment-fu__error">{error}</p> : null}
      {message ? <p className="leads-payment-fu__ok">{message}</p> : null}

      <div className="leads-payment-fu__table-wrap">
        <table className="leads-payment-fu__table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Phone</th>
              <th>Total Payment</th>
              <th>Received</th>
              <th>Due</th>
              <th>Last Date of Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="leads-machine-muted">
                  No payment follow-up clients yet. Add a client above.
                </td>
              </tr>
            ) : (
              clients.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/app/leads?period=all&leadId=${row.id}`}>
                      {row.name?.trim() || row.company?.trim() || "Client"}
                    </Link>
                    {row.company?.trim() && row.name?.trim() ? (
                      <div className="leads-machine-muted">{row.company}</div>
                    ) : null}
                  </td>
                  <td>{row.phone ?? "—"}</td>
                  <td>{formatPaymentAmount(row.paymentTotal)}</td>
                  <td>{formatPaymentAmount(row.paymentReceived)}</td>
                  <td>
                    <strong>{formatPaymentAmount(row.paymentDue)}</strong>
                  </td>
                  <td>{formatPaymentDateLabel(row.paymentLastDate)}</td>
                  <td className="leads-payment-fu__actions">
                    {canManage && row.canSendWhatsApp ? (
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={pending && sendingId === row.id}
                        onClick={() => onSendWa(row.id)}
                      >
                        {sendingId === row.id ? "Sending…" : "Send WA"}
                      </button>
                    ) : (
                      <span className="leads-machine-muted" title="Need phone and due &gt; 0">
                        —
                      </span>
                    )}
                    {canManage ? (
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        disabled={pending}
                        onClick={() => onRemove(row.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
