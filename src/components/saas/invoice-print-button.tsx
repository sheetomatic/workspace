"use client";

export function InvoicePrintButton() {
  return (
    <p className="no-print">
      <button
        className="btn-cta btn-primary"
        type="button"
        onClick={() => window.print()}
      >
        Download / print PDF
      </button>
    </p>
  );
}
