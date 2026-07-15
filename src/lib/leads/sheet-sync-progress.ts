/** Rows processed per sync invocation (stays within serverless time limits). */
export const GOOGLE_SHEETS_SYNC_BATCH_SIZE = 100;

/**
 * Stop before Vercel function timeout.
 * Cron `leads-sync` maxDuration is 300s — leave headroom for fetch + writeback.
 */
export const GOOGLE_SHEETS_SYNC_TIME_BUDGET_MS = 240_000;

export type SheetSyncProgress = {
  cursor: number;
  total: number;
};

export function readSheetSyncProgress(config: unknown): SheetSyncProgress | null {
  if (!config || typeof config !== "object") {
    return null;
  }
  const raw = config as Record<string, unknown>;
  const cursor = typeof raw.syncCursor === "number" ? raw.syncCursor : 0;
  const total = typeof raw.syncTotal === "number" ? raw.syncTotal : 0;
  if (total <= 0 || cursor <= 0) {
    return null;
  }
  if (cursor >= total) {
    return null;
  }
  return { cursor, total };
}

/**
 * Resume import cursor when the sheet grows (new rows append at the end).
 * Previously a total mismatch always reset to 0, so a growing ~900-row sheet
 * could restart forever and never reach the last rows.
 */
export function resolveSheetSyncResumeCursor(
  saved: SheetSyncProgress | null,
  rowCount: number,
): number {
  if (rowCount <= 0) {
    return 0;
  }
  if (!saved) {
    return 0;
  }

  const cursor = Math.max(0, Math.min(saved.cursor, rowCount));

  if (saved.total === rowCount) {
    return cursor;
  }

  // Sheet grew — continue from where we left off (new rows are at the end).
  if (rowCount > saved.total) {
    return cursor;
  }

  // Sheet shrank — restart from the top.
  return 0;
}

export function mergeSheetSyncProgress(
  config: unknown,
  progress: SheetSyncProgress | null,
): Record<string, unknown> {
  const base =
    config && typeof config === "object"
      ? { ...(config as Record<string, unknown>) }
      : {};

  if (!progress || progress.cursor >= progress.total) {
    delete base.syncCursor;
    delete base.syncTotal;
    return base;
  }

  return {
    ...base,
    syncCursor: progress.cursor,
    syncTotal: progress.total,
  };
}

/** Clear resume cursor so the next pull re-reads every sheet row. */
export function clearSheetSyncProgress(config: unknown): Record<string, unknown> {
  return mergeSheetSyncProgress(config, null);
}
