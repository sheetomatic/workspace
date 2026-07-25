"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/** Neon/serverless connection blips should self-heal, not look like a logout. */
function isTransientDbError(message: string | undefined) {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("connection") ||
    m.includes("pool timeout") ||
    m.includes("p2024") ||
    m.includes("p1001") ||
    m.includes("p1017") ||
    m.includes("econnreset") ||
    m.includes("socket") ||
    m.includes("engine is not yet connected") ||
    m.includes("response from the engine was empty")
  );
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const retried = useRef(false);

  // Auto-retry once for transient database/connection errors so a momentary
  // Postgres blip does not present as a "Sign in again" screen.
  useEffect(() => {
    if (!retried.current && isTransientDbError(error.message)) {
      retried.current = true;
      const timer = setTimeout(() => reset(), 400);
      return () => clearTimeout(timer);
    }
  }, [error, reset]);

  return (
    <div className="saas-page">
      <article className="saas-panel">
        <h2>Couldn’t load this page</h2>
        <p className="saas-panel-lead">
          Something went wrong loading this workspace page. You are still signed
          in — this is usually a temporary connection hiccup. Tap{" "}
          <strong>Try again</strong> to reload.
        </p>
        <p className="ws-api-hint">{error.message}</p>
        <div className="ws-task-ai-actions">
          <button className="btn-cta btn-primary" type="button" onClick={reset}>
            Try again
          </button>
          <Link className="btn-cta btn-secondary" href="/login">
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
