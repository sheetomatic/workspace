"use client";

import { Download, Sheet } from "lucide-react";
import { useState, useTransition } from "react";
import { exportTasksToGoogleSheetAction } from "@/app/app/tasks/export-actions";

export function TaskExportBar({
  spreadsheetUrl,
  sheetsReady,
  compact = false,
}: {
  spreadsheetUrl: string | null;
  sheetsReady: boolean;
  compact?: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function exportCsv() {
    window.location.href = "/api/tasks/export";
  }

  function exportSheets() {
    startTransition(async () => {
      const result = await exportTasksToGoogleSheetAction();
      setMessage(result.message);
      if (result.ok && result.spreadsheetUrl) {
        window.open(result.spreadsheetUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  if (compact) {
    return (
      <div className="ws-task-export-compact">
        <div className="ws-task-export-compact-actions">
          <button
            className="ws-task-export-btn ws-task-export-btn-compact"
            disabled={pending}
            title="Download CSV"
            type="button"
            onClick={exportCsv}
          >
            <Download size={15} aria-hidden />
            Download
          </button>
          <span aria-hidden className="ws-task-export-divider">
            |
          </span>
          <button
            className="ws-task-export-btn ws-task-export-btn-compact ws-task-export-btn-primary"
            disabled={pending || !sheetsReady}
            title={
              sheetsReady
                ? "Export to Google Sheets"
                : "Connect Google Sheets in Settings first"
            }
            type="button"
            onClick={exportSheets}
          >
            <Sheet size={15} aria-hidden />
            Export
          </button>
        </div>
        {spreadsheetUrl ? (
          <a
            className="ws-task-export-link ws-task-export-link-compact"
            href={spreadsheetUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open sheet
          </a>
        ) : null}
        {message ? <p className="ws-task-export-message ws-task-export-message-compact">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="ws-task-export-bar">
      <div className="ws-task-export-copy">
        <strong>Export data</strong>
        <p>Download CSV or push tasks to your linked Google Sheet.</p>
      </div>
      <div className="ws-task-export-actions">
        <button
          className="ws-task-export-btn"
          disabled={pending}
          type="button"
          onClick={exportCsv}
        >
          <Download size={16} aria-hidden />
          Download CSV
        </button>
        <button
          className="ws-task-export-btn ws-task-export-btn-primary"
          disabled={pending || !sheetsReady}
          title={
            sheetsReady
              ? "Write tasks to the Tasks tab in Google Sheets"
              : "Connect Google Sheets in Settings first"
          }
          type="button"
          onClick={exportSheets}
        >
          <Sheet size={16} aria-hidden />
          Export to Google Sheets
        </button>
        {spreadsheetUrl ? (
          <a
            className="ws-task-export-link"
            href={spreadsheetUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open sheet
          </a>
        ) : null}
      </div>
      {message ? <p className="ws-task-export-message">{message}</p> : null}
    </div>
  );
}
