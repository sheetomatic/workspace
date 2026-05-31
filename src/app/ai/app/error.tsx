"use client";

import Link from "next/link";

export default function AiAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="saas-page ws-wa-page-shell">
      <article className="saas-panel">
        <h2>This page could not load</h2>
        <p className="saas-panel-lead">
          A temporary server error occurred while loading Sheetomatic AI. Reload to
          try again, or open another section from the sidebar.
        </p>
        {error.digest ? (
          <p className="ws-api-hint">Reference: {error.digest}</p>
        ) : null}
        <div className="ws-task-ai-actions">
          <button className="btn-cta btn-primary" type="button" onClick={reset}>
            Reload
          </button>
          <Link className="btn-cta btn-secondary" href="/ai/app">
            Open dashboard
          </Link>
          <Link className="btn-cta btn-ghost" href="/ai/app/campaign">
            Campaign
          </Link>
        </div>
      </article>
    </div>
  );
}
