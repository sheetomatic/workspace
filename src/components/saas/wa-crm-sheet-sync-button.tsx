"use client";

import { useState, useTransition } from "react";
import { exportWaCrmToGoogleSheetAction } from "@/app/ai/app/contacts/actions";

export function WaCrmSheetSyncButton() {
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function runExport() {
    startTransition(async () => {
      const result = await exportWaCrmToGoogleSheetAction();
      setOk(result.ok);
      setMessage(result.message);
    });
  }

  return (
    <div className="wa-crm-sheet-sync">
      <button
        className="wa-crm-head-link"
        disabled={pending}
        type="button"
        onClick={runExport}
      >
        {pending ? "Syncing..." : "Sync to Sheet"}
      </button>
      {message ? (
        <p
          className={
            ok ? "saas-form-message ok wa-crm-sheet-sync-msg" : "saas-form-message error wa-crm-sheet-sync-msg"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
