"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function LeadsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("leads page error", error);
  }, [error]);

  return (
    <div className="saas-page leads-machine-page">
      <div className="leads-error-panel">
        <h1>Leads could not load</h1>
        <p>
          The database was briefly unavailable (common right after idle / cold
          start). Click <strong>Try again</strong> — it usually loads on the
          next attempt. If it keeps failing, open{" "}
          <Link href="/app/leads?period=all">all leads</Link>.
        </p>
        <p className="leads-machine-muted">{error.message}</p>
        <div className="leads-error-actions">
          <button type="button" className="btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <Link className="btn-secondary" href="/app/leads?period=all">
            Open all leads
          </Link>
        </div>
      </div>
    </div>
  );
}
