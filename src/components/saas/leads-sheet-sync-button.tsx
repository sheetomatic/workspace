"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SyncApiResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

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
      try {
        const response = await fetch("/api/leads/sheets-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceFull }),
        });
        let result: SyncApiResult;
        try {
          result = (await response.json()) as SyncApiResult;
        } catch {
          setIsError(true);
          setMessage(
            "Sync was interrupted. Click Sync now again — new sheet rows are imported first.",
          );
          return;
        }
        if (!response.ok || !result.ok) {
          setMessage(
            "message" in result && result.message
              ? result.message
              : "Sync failed. Try again.",
          );
          setIsError(true);
          return;
        }
        setMessage(result.message);
        setIsError(false);
        // Short delay so Neon can release sync connections before CRM reload.
        await new Promise((resolve) => setTimeout(resolve, 400));
        router.refresh();
      } catch {
        setIsError(true);
        setMessage(
          "Sync was interrupted. Click Sync now again — new sheet rows are imported first.",
        );
      }
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
