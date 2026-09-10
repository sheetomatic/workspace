"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteFmsInstanceAction } from "@/app/app/fms/workflow-actions";

export function FmsDeleteJobButton({
  instanceId,
  redirectTo,
  className = "btn-secondary btn-sm ws-fms-btn-danger",
  label = "Remove",
}: {
  instanceId: string;
  redirectTo?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <span
      className="ws-fms-delete-job"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={className}
        disabled={pending}
        aria-label="Remove FMS job"
        onClick={() => {
          const confirmed = window.confirm(
            "Remove this FMS job? The workflow stays. This row will disappear from the tracker.",
          );
          if (!confirmed) {
            return;
          }
          startTransition(async () => {
            const result = await deleteFmsInstanceAction(instanceId);
            if (!result.ok) {
              setMessage(result.message);
              return;
            }
            if (redirectTo) {
              router.push(redirectTo);
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Removing…" : label}
      </button>
      {message ? <span className="ws-fms-muted">{message}</span> : null}
    </span>
  );
}
