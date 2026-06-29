export type LeadSyncCounts = {
  processed: number;
  created: number;
  updated: number;
};

export function formatLeadSyncCounts(counts: LeadSyncCounts) {
  if (counts.processed === 0) {
    return "No lead rows found in the sheet.";
  }

  const parts = [`Synced ${counts.processed} row${counts.processed === 1 ? "" : "s"}`];
  if (counts.created > 0) {
    parts.push(`${counts.created} new`);
  }
  if (counts.updated > 0) {
    parts.push(`${counts.updated} updated`);
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
    default:
      return reason;
  }
}
