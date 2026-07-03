import type { SheetSyncProgress } from "@/lib/leads/sheet-sync-progress";

export type LeadSyncCounts = {
  processed: number;
  created: number;
  updated: number;
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
    return "No lead rows found in the sheet.";
  }

  const parts: string[] = [];
  if (partial && partial.cursor < partial.total) {
    parts.push(`Imported ${partial.cursor} of ${partial.total} sheet rows`);
  } else if (counts.processed > 0) {
    parts.push(`Synced ${counts.processed} row${counts.processed === 1 ? "" : "s"}`);
  }

  if (counts.created > 0) {
    parts.push(`${counts.created} new`);
  }
  if (counts.updated > 0) {
    parts.push(`${counts.updated} updated`);
  }

  if (partial && partial.cursor < partial.total) {
    parts.push("sync continues automatically every 15 min");
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
    default:
      return reason;
  }
}
