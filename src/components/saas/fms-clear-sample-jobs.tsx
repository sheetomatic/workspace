"use client";

import { useState, useTransition } from "react";
import { clearOrganizationFmsJobsAction } from "@/app/app/fms/actions";

export function FmsClearSampleJobsButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <span className="ws-fms-clear-jobs">
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={pending}
        onClick={() => {
          const confirmed = window.confirm(
            "Delete all FMS jobs in this workspace? These look like sample pipelines. Workflows stay so you can add real jobs from Leads.",
          );
          if (!confirmed) {
            return;
          }
          startTransition(async () => {
            const result = await clearOrganizationFmsJobsAction();
            setMessage(result.message);
          });
        }}
      >
        {pending ? "Clearing…" : "Clear sample jobs"}
      </button>
      {message ? <span className="ws-fms-muted">{message}</span> : null}
    </span>
  );
}
