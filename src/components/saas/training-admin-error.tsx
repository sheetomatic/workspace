"use client";

export function TrainingAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="saas-page leads-machine-page">
      <div className="leads-error-panel">
        <h1>Training could not load</h1>
        <p>
          The page hit a brief error. Click <strong>Try again</strong> — stay
          here. Students and Teach will come back on the next load.
        </p>
        <p className="leads-machine-muted">{error.message}</p>
        <div className="leads-error-actions">
          <button type="button" className="btn-primary" onClick={() => reset()}>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
