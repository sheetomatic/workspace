"use client";

import Link from "next/link";

export function SalarySlipToolbar() {
  return (
    <div className="salary-slip-toolbar no-print">
      <Link className="btn-secondary btn-sm" href="/app/hr/payroll">
        Back to payroll
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
