"use client";

import { Download } from "lucide-react";

export function TaskExportBar({
  compact = false,
}: {
  spreadsheetUrl: string | null;
  sheetsReady: boolean;
  compact?: boolean;
}) {
  function exportCsv() {
    window.location.href = "/api/tasks/export";
  }

  if (compact) {
    return (
      <div className="ws-task-export-compact">
        <div className="ws-task-export-compact-actions">
          <button
            className="ws-task-export-btn ws-task-export-btn-compact"
            title="Download CSV"
            type="button"
            onClick={exportCsv}
          >
            <Download size={15} aria-hidden />
            Download
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-task-export-bar">
      <div className="ws-task-export-copy">
        <strong>Download data</strong>
        <p>Download the current task data as CSV.</p>
      </div>
      <div className="ws-task-export-actions">
        <button
          className="ws-task-export-btn"
          type="button"
          onClick={exportCsv}
        >
          <Download size={16} aria-hidden />
          Download CSV
        </button>
      </div>
    </div>
  );
}
