"use client";

import Link from "next/link";

export default function CasesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="saas-page">
      <article className="saas-panel">
        <h2>Cases dashboard unavailable</h2>
        <p className="saas-panel-lead">
          The MACT cases dashboard could not load. If you just reset the database,
          sign in again after seeding.
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
          <Link className="btn-cta btn-primary" href="/login">
            Sign in again
          </Link>
        </div>
      </article>
    </div>
  );
}
