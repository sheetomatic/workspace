"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncLeadChannelNow } from "@/app/app/leads/actions";

export function LeadsSheetSyncButton({
  canManage,
  importProgressLabel = null,
}: {
  canManage: boolean;
  /** e.g. "Importing 720/897" — shown so admins know Sync now continues the batch. */
  importProgressLabel?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!canManage) {
    return null;
  }

  function runSync(forceFull: boolean) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await syncLeadChannelNow("GOOGLE_SHEETS", { forceFull });
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage(result.message);
      setIsError(false);
      router.refresh();
    });
  }

  return (
    <div className="leads-sheet-sync-actions">
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={pending}
        title={
          importProgressLabel
            ? `Continue sheet import (${importProgressLabel})`
            : "Pull latest rows from Google Sheets into CRM"
        }
        onClick={() => runSync(false)}
      >
        {pending ? "Syncing…" : importProgressLabel ? "Continue import" : "Sync now"}
      </button>
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={pending}
        title="Re-read every sheet row from the top (use if leads like Yogesh are missing)"
        onClick={() => {
          if (
            !window.confirm(
              "Re-import all Google Sheet rows from the top? This updates matching leads and adds any missing ones (rows need a valid phone).",
            )
          ) {
            return;
          }
          runSync(true);
        }}
      >
        {pending ? "…" : "Full re-import"}
      </button>
      {message ? (
        <span
          className={
            isError ? "leads-settings-notice is-error" : "leads-settings-notice is-success"
          }
          role="status"
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
