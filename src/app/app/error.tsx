"use client";

import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="saas-page">
      <article className="saas-panel">
        <h2>Workspace error</h2>
        <p className="saas-panel-lead">
          Your user dashboard could not load. This often happens after a database
          reset while you are still signed in.
        </p>
        <p className="ws-api-hint">{error.message}</p>
        <div className="ws-task-ai-actions">
          <button className="btn-cta btn-secondary" type="button" onClick={reset}>
            Try again
          </button>
          <Link className="btn-cta btn-primary" href="/login">
            Sign in again
          </Link>
        </div>
        <p className="ws-api-hint">
          Local fix: run <code>npm run db:seed</code>, restart the dev server (
          <code>npm run dev</code>), then sign in again. Demo password:{" "}
          <code>demo1234</code> (super admin:{" "}
          <code>founder@sheetomatic.com</code>).
        </p>
      </article>
    </div>
  );
}
