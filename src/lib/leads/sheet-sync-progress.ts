/** Rows processed per sync invocation (stays within serverless time limits). */
export const GOOGLE_SHEETS_SYNC_BATCH_SIZE = 80;

/**
 * Cron `leads-sync` maxDuration is 300s — leave headroom for fetch + writeback.
 */
export const GOOGLE_SHEETS_SYNC_TIME_BUDGET_MS = 240_000;

/**
 * Interactive Sync now / CRM auto-continue — must finish before the HTTP
 * request is killed. A 240s budget inside a ~60s server action caused
 * "An unexpected response was received from the server" and left Neon
 * connections exhausted so /app/leads failed to load.
 */
export const GOOGLE_SHEETS_SYNC_INTERACTIVE_BUDGET_MS = 50_000;

/**
 * After a completed sync (no cursor), re-check only this many trailing rows
 * once — covers orgs that never had a watermark yet without re-walking 1k+.
 */
export const SHEET_SYNC_CATCHUP_TAIL = 80;

/**
 * Ignore tiny sheet-size dips (API/CSV glitches). A real delete of many rows
 * still triggers a controlled restart.
 */
export const SHEET_SYNC_SHRINK_TOLERANCE = 25;

export type SheetSyncProgress = {
  /** Next ordered body index to process (0..bodyEnd). */
  cursor: number;
  /** Sheet row count when progress was last saved. */
  total: number;
  /**
   * Next index in the appended tail (bodyEnd..total).
   * When set and < total, new Google Sheet rows are imported first.
   */
  tailCursor?: number;
  /** End of the "body" region (= previous total when the sheet grew). */
  bodyEnd?: number;
};

export type SheetSyncPlanMode =
  | "full"
  | "resume"
  | "tail"
  | "catchup"
  | "noop"
  | "restart";

type SyncConfigFields = {
  syncCursor?: unknown;
  syncTotal?: unknown;
  syncTailCursor?: unknown;
  syncBodyEnd?: unknown;
  /** Highest sheet row index fully synced (watermark). Survives completed syncs. */
  syncWatermarkTotal?: unknown;
};

function range(start: number, end: number): number[] {
  if (end <= start) {
    return [];
  }
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export function readSheetSyncWatermark(config: unknown): number | null {
  if (!config || typeof config !== "object") {
    return null;
  }
  const raw = (config as SyncConfigFields).syncWatermarkTotal;
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0
    ? Math.floor(raw)
    : null;
}

export function readSheetSyncProgress(config: unknown): SheetSyncProgress | null {
  if (!config || typeof config !== "object") {
    return null;
  }
  const raw = config as SyncConfigFields;
  const cursor = typeof raw.syncCursor === "number" ? raw.syncCursor : 0;
  const total = typeof raw.syncTotal === "number" ? raw.syncTotal : 0;
  const tailCursor =
    typeof raw.syncTailCursor === "number" ? raw.syncTailCursor : undefined;
  const bodyEnd =
    typeof raw.syncBodyEnd === "number" ? raw.syncBodyEnd : undefined;

  if (total <= 0) {
    return null;
  }

  const tailPending =
    tailCursor != null && bodyEnd != null && tailCursor < total;
  const bodyPending = cursor < (bodyEnd ?? total);

  if (!tailPending && !bodyPending) {
    return null;
  }

  return {
    cursor: Math.max(0, cursor),
    total,
    ...(tailCursor != null ? { tailCursor } : {}),
    ...(bodyEnd != null ? { bodyEnd } : {}),
  };
}

/**
 * How many sheet rows are done for UI labels (body + imported tail).
 */
export function sheetSyncImportedCount(progress: SheetSyncProgress): number {
  const bodyEnd = progress.bodyEnd ?? progress.total;
  const bodyDone = Math.min(progress.cursor, bodyEnd);
  const tailDone =
    progress.tailCursor != null
      ? Math.max(0, progress.tailCursor - bodyEnd)
      : 0;
  return Math.min(progress.total, bodyDone + tailDone);
}

export function formatSheetSyncProgressLabel(progress: SheetSyncProgress): string {
  return `${sheetSyncImportedCount(progress)}/${progress.total}`;
}

/**
 * Build the next indices to ingest.
 * When the sheet grows, appended rows are queued first so new leads show in CRM
 * before a long historical backfill finishes.
 */
export function buildSheetSyncWorkPlan(
  saved: SheetSyncProgress | null,
  rowCount: number,
): {
  indices: number[];
  /** Progress snapshot before this run (for saving mid-flight). */
  start: SheetSyncProgress;
} {
  if (rowCount <= 0) {
    return {
      indices: [],
      start: { cursor: 0, total: 0, bodyEnd: 0 },
    };
  }

  if (!saved) {
    return {
      indices: range(0, rowCount),
      start: { cursor: 0, total: rowCount, bodyEnd: rowCount },
    };
  }

  // Sheet shrank — restart.
  if (rowCount < saved.total) {
    return {
      indices: range(0, rowCount),
      start: { cursor: 0, total: rowCount, bodyEnd: rowCount },
    };
  }

  // Sheet grew — catch the new tail first, then finish the body gap.
  if (rowCount > saved.total) {
    const bodyEnd = saved.bodyEnd ?? saved.total;
    const bodyCursor = Math.min(saved.cursor, bodyEnd);
    const tailCursor =
      saved.tailCursor != null && saved.tailCursor >= bodyEnd
        ? saved.tailCursor
        : saved.total;
    const indices: number[] = [
      ...range(Math.min(tailCursor, rowCount), rowCount),
      ...range(bodyCursor, bodyEnd),
    ];
    return {
      indices,
      start: {
        cursor: bodyCursor,
        total: rowCount,
        tailCursor: Math.min(tailCursor, rowCount),
        bodyEnd,
      },
    };
  }

  // Same size — continue body (and any unfinished tail from a prior growth).
  const bodyEnd = saved.bodyEnd ?? saved.total;
  const bodyCursor = Math.min(saved.cursor, bodyEnd);
  const indices: number[] = [];
  if (saved.tailCursor != null && saved.tailCursor < rowCount) {
    indices.push(...range(saved.tailCursor, rowCount));
  }
  indices.push(...range(bodyCursor, bodyEnd));
  return {
    indices,
    start: {
      cursor: bodyCursor,
      total: rowCount,
      ...(saved.tailCursor != null ? { tailCursor: saved.tailCursor } : {}),
      bodyEnd,
    },
  };
}

/**
 * Plan work for a sync invocation.
 *
 * Root cause of "synced to 1374 then jumps back to ~300":
 * after a completed sync we used to clear the cursor, so the next auto-sync
 * walked the sheet from row 0 again. Watermark keeps the high-water mark so
 * only newly appended rows are imported.
 */
export function planGoogleSheetSync(params: {
  saved: SheetSyncProgress | null;
  watermark: number | null;
  rowCount: number;
  forceFull?: boolean;
  /** Connection has lastSyncAt — used once to migrate pre-watermark orgs. */
  previouslySynced?: boolean;
}): {
  indices: number[];
  start: SheetSyncProgress;
  mode: SheetSyncPlanMode;
} {
  const { rowCount } = params;

  if (rowCount <= 0) {
    return {
      indices: [],
      start: { cursor: 0, total: 0, bodyEnd: 0 },
      mode: "noop",
    };
  }

  if (params.forceFull) {
    const plan = buildSheetSyncWorkPlan(null, rowCount);
    return { ...plan, mode: "full" };
  }

  if (params.saved) {
    const plan = buildSheetSyncWorkPlan(params.saved, rowCount);
    return { ...plan, mode: "resume" };
  }

  const watermark = params.watermark;

  if (watermark != null) {
    if (rowCount > watermark) {
      // Only new appended rows — this is what Sync now should do day-to-day.
      return {
        indices: range(watermark, rowCount),
        start: {
          cursor: watermark,
          total: rowCount,
          bodyEnd: watermark,
          tailCursor: watermark,
        },
        mode: "tail",
      };
    }

    // Same size, or a tiny glitch dip — do not restart from 0.
    if (rowCount + SHEET_SYNC_SHRINK_TOLERANCE >= watermark) {
      return {
        indices: [],
        start: {
          cursor: rowCount,
          total: rowCount,
          bodyEnd: rowCount,
        },
        mode: "noop",
      };
    }

    // Large shrink — controlled full restart.
    const plan = buildSheetSyncWorkPlan(null, rowCount);
    return { ...plan, mode: "restart" };
  }

  // No watermark yet. If CRM already synced before, catch up the tail only
  // instead of re-importing all ~1374 rows from the top.
  if (params.previouslySynced) {
    const from = Math.max(0, rowCount - SHEET_SYNC_CATCHUP_TAIL);
    return {
      indices: range(from, rowCount),
      start: {
        cursor: from,
        total: rowCount,
        bodyEnd: from,
        tailCursor: from,
      },
      mode: "catchup",
    };
  }

  const plan = buildSheetSyncWorkPlan(null, rowCount);
  return { ...plan, mode: "full" };
}

/** Advance progress after successfully processing `processedIndex`. */
export function advanceSheetSyncProgress(
  current: SheetSyncProgress,
  processedIndex: number,
): SheetSyncProgress {
  const bodyEnd = current.bodyEnd ?? current.total;
  let { cursor, tailCursor } = current;

  if (processedIndex >= bodyEnd) {
    tailCursor = Math.max(tailCursor ?? bodyEnd, processedIndex + 1);
  } else if (processedIndex === cursor) {
    cursor = processedIndex + 1;
  }

  return {
    cursor,
    total: current.total,
    bodyEnd,
    ...(tailCursor != null ? { tailCursor } : {}),
  };
}

export function isSheetSyncComplete(progress: SheetSyncProgress): boolean {
  const bodyEnd = progress.bodyEnd ?? progress.total;
  const bodyDone = progress.cursor >= bodyEnd;
  const tailDone =
    progress.tailCursor == null || progress.tailCursor >= progress.total;
  return bodyDone && tailDone;
}

/**
 * Resume import cursor when the sheet grows (new rows append at the end).
 * Kept for tests / older call sites.
 */
export function resolveSheetSyncResumeCursor(
  saved: SheetSyncProgress | null,
  rowCount: number,
): number {
  const { indices } = buildSheetSyncWorkPlan(saved, rowCount);
  return indices[0] ?? rowCount;
}

export function mergeSheetSyncProgress(
  config: unknown,
  progress: SheetSyncProgress | null,
  options?: { watermarkTotal?: number | null },
): Record<string, unknown> {
  const base =
    config && typeof config === "object"
      ? { ...(config as Record<string, unknown>) }
      : {};

  if (!progress || isSheetSyncComplete(progress)) {
    delete base.syncCursor;
    delete base.syncTotal;
    delete base.syncTailCursor;
    delete base.syncBodyEnd;
    const watermark =
      options?.watermarkTotal != null
        ? options.watermarkTotal
        : typeof base.syncWatermarkTotal === "number"
          ? base.syncWatermarkTotal
          : null;
    if (watermark != null && watermark >= 0) {
      base.syncWatermarkTotal = watermark;
    }
    return base;
  }

  const next: Record<string, unknown> = {
    ...base,
    syncCursor: progress.cursor,
    syncTotal: progress.total,
  };
  if (progress.bodyEnd != null) {
    next.syncBodyEnd = progress.bodyEnd;
  } else {
    delete next.syncBodyEnd;
  }
  if (progress.tailCursor != null && progress.tailCursor < progress.total) {
    next.syncTailCursor = progress.tailCursor;
  } else {
    delete next.syncTailCursor;
  }
  return next;
}

/** Clear resume cursor + watermark so the next pull re-reads every sheet row. */
export function clearSheetSyncProgress(config: unknown): Record<string, unknown> {
  const base = mergeSheetSyncProgress(config, null);
  delete base.syncWatermarkTotal;
  return base;
}
