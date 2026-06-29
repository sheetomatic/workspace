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
          The leads workspace hit an error while loading. This is often fixed by
          redeploying after database migrations, or by opening{" "}
          <Link href="/app/leads?period=all">all leads</Link> instead of a narrow
          date range.
        </p>
        <p className="leads-machine-muted">{error.message}</p>
        <div className="leads-error-actions">
          <button type="button" className="btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <Link className="btn-secondary" href="/app/leads/settings">
            Open setup
          </Link>
        </div>
      </div>
    </div>
  );
}
