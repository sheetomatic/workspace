"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  clearOrganizationFmsJobsAction,
  clearTemplateFmsJobsAction,
} from "@/app/app/fms/actions";

export function FmsClearSampleJobsButton({
  templateId,
  label,
}: {
  templateId?: string;
  label?: string;
} = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const scoped = Boolean(templateId);
  const buttonLabel =
    label ?? (scoped ? "Delete jobs" : "Delete all jobs");

  return (
    <span className="ws-fms-clear-jobs">
      <button
        type="button"
        className="btn-secondary btn-sm ws-fms-btn-danger"
        disabled={pending}
        onClick={() => {
          const confirmed = window.confirm(
            scoped
              ? "Delete every job on this workflow? The workflow itself stays."
              : "Delete every FMS job in this workspace? Workflows stay so you can add real jobs from Leads.",
          );
          if (!confirmed) {
            return;
          }
          startTransition(async () => {
            const result = templateId
              ? await clearTemplateFmsJobsAction(templateId)
              : await clearOrganizationFmsJobsAction();
            setMessage(result.message);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        {pending ? "Deleting…" : buttonLabel}
      </button>
      {message ? <span className="ws-fms-muted">{message}</span> : null}
    </span>
  );
}
