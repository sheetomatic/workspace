"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  reviseLeadQuotation,
  sendLeadQuotationEmail,
  sendLeadQuotationWhatsApp,
} from "@/app/app/leads/actions";

type StatusMessage = {
  tone: "success" | "error";
  text: string;
};

export function QuotationPrintToolbar({
  quotationId,
  isLocked = false,
  publicView = false,
  canManage = true,
}: {
  quotationId?: string;
  isLocked?: boolean;
  publicView?: boolean;
  canManage?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<StatusMessage | null>(null);

  if (publicView) {
    return (
      <div className="quotation-print-toolbar no-print">
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => window.print()}
        >
          Print / Save PDF
        </button>
      </div>
    );
  }

  return (
    <div className="quotation-print-toolbar-wrap no-print">
      <div className="quotation-print-toolbar">
        <Link className="btn-secondary btn-sm" href="/app/leads">
          Back to leads
        </Link>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => window.print()}
        >
          Print / Save PDF
        </button>
        {quotationId && canManage && !isLocked ? (
          <>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={pending}
              onClick={() => {
                setStatus(null);
                startTransition(async () => {
                  const result = await sendLeadQuotationWhatsApp(quotationId);
                  if (result.ok && result.waUrl) {
                    window.open(result.waUrl, "_blank", "noopener,noreferrer");
                    setStatus({
                      tone: "success",
                      text: "Marked sent — WhatsApp opened.",
                    });
                  } else {
                    setStatus({
                      tone: "error",
                      text: result.message ?? "Could not send on WhatsApp.",
                    });
                  }
                });
              }}
            >
              Send WhatsApp
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={pending}
              onClick={() => {
                setStatus(null);
                startTransition(async () => {
                  const result = await sendLeadQuotationEmail(quotationId);
                  setStatus(
                    result.ok
                      ? { tone: "success", text: "Email sent." }
                      : {
                          tone: "error",
                          text: result.message ?? "Could not send email.",
                        },
                  );
                });
              }}
            >
              Send email
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={pending}
              onClick={() => {
                setStatus(null);
                startTransition(async () => {
                  const result = await reviseLeadQuotation(quotationId);
                  if (result.ok && result.quotationId) {
                    window.location.href = `/app/leads/quotations/${result.quotationId}/print`;
                  } else {
                    setStatus({
                      tone: "error",
                      text: result.message ?? "Could not create revision.",
                    });
                  }
                });
              }}
            >
              Send revised
            </button>
          </>
        ) : null}
      </div>
      {status ? (
        <p
          role="status"
          className={`quotation-print-toolbar-status is-${status.tone}`}
          style={{
            margin: "0 0 1rem",
            fontSize: "0.85rem",
            fontWeight: 600,
            color: status.tone === "success" ? "#047857" : "#b91c1c",
          }}
        >
          {status.text}
        </p>
      ) : null}
    </div>
  );
}
