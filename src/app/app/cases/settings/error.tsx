"use client";

import Link from "next/link";

export default function CasesSettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="saas-page">
      <article className="saas-panel">
        <h2>Import & export unavailable</h2>
        <p className="saas-panel-lead">
          Cases import/export settings could not load. This can happen when the
          database is still migrating or the session is stale.
        </p>
        {error.message ? (
          <p className="ws-api-hint">{error.message}</p>
        ) : null}
        {error.digest ? (
          <p className="ws-api-hint">Reference: {error.digest}</p>
        ) : null}
        <div className="ws-task-ai-actions">
          <button className="btn-cta btn-secondary" type="button" onClick={reset}>
            Try again
          </button>
          <Link className="btn-cta btn-primary" href="/app/cases">
            Back to dashboard
          </Link>
        </div>
      </article>
    </div>
  );
}
