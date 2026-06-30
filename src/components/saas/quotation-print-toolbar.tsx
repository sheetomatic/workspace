"use client";

import Link from "next/link";

export function QuotationPrintToolbar() {
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
    </div>
  );
}
