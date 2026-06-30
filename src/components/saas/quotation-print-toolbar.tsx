"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  reviseLeadQuotation,
  sendLeadQuotationEmail,
  sendLeadQuotationWhatsApp,
} from "@/app/app/leads/actions";

export function QuotationPrintToolbar({
  quotationId,
  isLocked = false,
  publicView = false,
}: {
  quotationId?: string;
  isLocked?: boolean;
  publicView?: boolean;
}) {
  const [pending, startTransition] = useTransition();

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
    <div className="quotation-print-toolbar no-print">
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
      {quotationId && !isLocked ? (
        <>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await sendLeadQuotationWhatsApp(quotationId);
                if (result.ok && result.waUrl) {
                  window.open(result.waUrl, "_blank", "noopener,noreferrer");
                }
              })
            }
          >
            Send WhatsApp
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await sendLeadQuotationEmail(quotationId);
              })
            }
          >
            Send email
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await reviseLeadQuotation(quotationId);
                if (result.ok && result.quotationId) {
                  window.location.href = `/app/leads/quotations/${result.quotationId}/print`;
                }
              })
            }
          >
            Send revised
          </button>
        </>
      ) : null}
    </div>
  );
}
