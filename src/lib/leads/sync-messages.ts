import {
  sheetSyncImportedCount,
  type SheetSyncProgress,
} from "@/lib/leads/sheet-sync-progress";

export type LeadSyncCounts = {
  processed: number;
  created: number;
  updated: number;
  /** Rows skipped (usually missing/invalid phone). */
  skipped?: number;
};

export type LeadSyncResult = {
  ok: true;
  imported: number;
  counts: LeadSyncCounts;
  partial?: SheetSyncProgress;
};

export type LeadSyncFailure = {
  ok: false;
  reason: string;
};

export type LeadPullResult = LeadSyncResult | LeadSyncFailure;

export function formatLeadSyncCounts(
  counts: LeadSyncCounts,
  partial?: SheetSyncProgress,
) {
  if (counts.processed === 0 && !partial) {
    if ((counts.skipped ?? 0) > 0) {
      return `${counts.skipped} row${counts.skipped === 1 ? "" : "s"} skipped (need valid phone).`;
    }
    return "Sheet already up to date — no new rows to import.";
  }

  const parts: string[] = [];
  if (partial) {
    parts.push(
      `Imported ${sheetSyncImportedCount(partial)} of ${partial.total} sheet rows`,
    );
  } else if (counts.processed > 0) {
    parts.push(`Synced ${counts.processed} row${counts.processed === 1 ? "" : "s"}`);
  }

  if (counts.created > 0) {
    parts.push(`${counts.created} new`);
  }
  if (counts.updated > 0) {
    parts.push(`${counts.updated} updated`);
  }
  if ((counts.skipped ?? 0) > 0) {
    parts.push(`${counts.skipped} skipped (need valid phone)`);
  }

  if (partial) {
    parts.push("new sheet rows first — click Sync now again to continue");
  }

  return parts.join(" · ");
}

export function formatLeadSyncError(reason: string) {
  switch (reason) {
    case "connection_disabled":
      return "Google Sheets is disabled. Enable it, save, then sync again.";
    case "missing_spreadsheet":
      return "Add a spreadsheet URL before syncing.";
    case "missing_api_url":
      return "API URL is not configured for this connector.";
    case "export_failed":
      return "Imported from sheet but could not push CRM updates back to Google Sheets.";
    case "sync_in_progress":
      return "A sync is already running. Wait a moment, then try again.";
    default:
      return reason;
  }
}
