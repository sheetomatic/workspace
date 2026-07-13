"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendLeadNurtureWhatsAppAction } from "@/app/app/leads/actions";
import {
  alertKindLabel,
  type CrmAlertItem,
} from "@/lib/leads/alerts/types";
import { buildLeadsListQuery, type LeadsListSearchParams } from "@/lib/leads/list-params";
import { formatWhatsAppPhone } from "@/lib/phone";

export function LeadsAlertCenter({
  items,
  baseParams,
  canSend,
}: {
  items: CrmAlertItem[];
  baseParams: LeadsListSearchParams;
  canSend: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | CrmAlertItem["kind"]>("all");

  const filtered =
    filter === "all" ? items : items.filter((item) => item.kind === filter);

  const counts = {
    all: items.length,
    payment_not_received: items.filter((i) => i.kind === "payment_not_received")
      .length,
    quotation_not_accepted: items.filter((i) => i.kind === "quotation_not_accepted")
      .length,
    negotiation: items.filter((i) => i.kind === "negotiation").length,
  };

  function sendAlert(item: CrmAlertItem) {
    startTransition(async () => {
      const result = await sendLeadNurtureWhatsAppAction(item.leadId, item.event);
      setFeedback(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <section className="leads-alert-center" aria-label="CRM alert center">
      <header className="leads-alert-center-head">
        <div>
          <h2>Alert center</h2>
          <p>
            Payment not received, quotation awaiting acceptance, and negotiation
            follow-ups — same rhythm as nurture.
          </p>
        </div>
        <Link className="btn-secondary btn-sm" href="/app/leads/settings#nurture-messages">
          Setup alerts
        </Link>
      </header>

      <div className="leads-alert-filters" role="tablist" aria-label="Alert filters">
        {(
          [
            ["all", "All"],
            ["payment_not_received", "Payment"],
            ["quotation_not_accepted", "Quotation"],
            ["negotiation", "Negotiation"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={`leads-alert-filter${filter === id ? " is-active" : ""}`}
            onClick={() => setFilter(id)}
          >
            {label}
            <strong>{counts[id]}</strong>
          </button>
        ))}
      </div>

      {feedback ? <p className="leads-alert-feedback">{feedback}</p> : null}

      {filtered.length === 0 ? (
        <p className="leads-machine-muted leads-alert-empty">
          No open alerts in this filter. Check Setup for wait days and message
          templates.
        </p>
      ) : (
        <ul className="leads-alert-list">
          {filtered.map((item) => (
            <li key={item.id} className={item.daysOverdue >= 5 ? "is-overdue" : ""}>
              <div className="leads-alert-copy">
                <span className="leads-alert-kind">{alertKindLabel(item.kind)}</span>
                <strong>{item.leadName?.trim() || item.company || "Lead"}</strong>
                <span className="leads-machine-muted">
                  {item.phone ? formatWhatsAppPhone(item.phone) ?? item.phone : "—"}
                  {" · "}
                  {item.reason}
                  {item.alreadyMessaged ? " · message sent" : ""}
                </span>
              </div>
              <div className="leads-alert-actions">
                <Link
                  className="btn-secondary btn-sm"
                  href={`/app/leads?${buildLeadsListQuery(baseParams, {
                    leadId: item.leadId,
                    page: "1",
                  })}`}
                >
                  Open
                </Link>
                {canSend ? (
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={pending}
                    onClick={() => sendAlert(item)}
                  >
                    {item.alreadyMessaged ? "Resend" : "Send alert"}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
