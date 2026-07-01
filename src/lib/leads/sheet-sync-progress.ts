/** Rows processed per sync invocation (stays within serverless time limits). */
export const GOOGLE_SHEETS_SYNC_BATCH_SIZE = 80;

/** Stop processing before Vercel function timeout. */
export const GOOGLE_SHEETS_SYNC_TIME_BUDGET_MS = 50_000;

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
