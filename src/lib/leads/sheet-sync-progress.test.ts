import { describe, expect, it } from "vitest";
import {
  advanceSheetSyncProgress,
  buildSheetSyncWorkPlan,
  clearSheetSyncProgress,
  formatSheetSyncProgressLabel,
  isSheetSyncComplete,
  mergeSheetSyncProgress,
  planGoogleSheetSync,
  readSheetSyncProgress,
  readSheetSyncWatermark,
  resolveSheetSyncResumeCursor,
  SHEET_SYNC_CATCHUP_TAIL,
} from "@/lib/leads/sheet-sync-progress";

describe("buildSheetSyncWorkPlan", () => {
  it("starts from 0 with no saved progress", () => {
    const plan = buildSheetSyncWorkPlan(null, 10);
    expect(plan.indices[0]).toBe(0);
    expect(plan.indices).toHaveLength(10);
  });

  it("continues body when total is unchanged", () => {
    const plan = buildSheetSyncWorkPlan({ cursor: 400, total: 800 }, 800);
    expect(plan.indices[0]).toBe(400);
    expect(plan.indices.at(-1)).toBe(799);
  });

  it("prioritizes newly appended sheet rows when the sheet grows", () => {
    const plan = buildSheetSyncWorkPlan({ cursor: 720, total: 800 }, 897);
    expect(plan.indices[0]).toBe(800);
    expect(plan.indices[96]).toBe(896);
    expect(plan.indices[97]).toBe(720);
    expect(resolveSheetSyncResumeCursor({ cursor: 720, total: 800 }, 897)).toBe(
      800,
    );
  });

  it("restarts when the sheet shrinks", () => {
    const plan = buildSheetSyncWorkPlan({ cursor: 400, total: 800 }, 200);
    expect(plan.indices[0]).toBe(0);
    expect(plan.indices).toHaveLength(200);
  });
});

describe("planGoogleSheetSync watermark", () => {
  it("only imports rows after the watermark (fixes 1374→restart gap)", () => {
    const plan = planGoogleSheetSync({
      saved: null,
      watermark: 1374,
      rowCount: 1380,
      previouslySynced: true,
    });
    expect(plan.mode).toBe("tail");
    expect(plan.indices).toEqual([1374, 1375, 1376, 1377, 1378, 1379]);
  });

  it("is a noop when watermark matches sheet size", () => {
    const plan = planGoogleSheetSync({
      saved: null,
      watermark: 1374,
      rowCount: 1374,
      previouslySynced: true,
    });
    expect(plan.mode).toBe("noop");
    expect(plan.indices).toEqual([]);
  });

  it("ignores tiny shrink glitches instead of restarting from 0", () => {
    const plan = planGoogleSheetSync({
      saved: null,
      watermark: 1374,
      rowCount: 1360,
      previouslySynced: true,
    });
    expect(plan.mode).toBe("noop");
    expect(plan.indices).toEqual([]);
  });

  it("catchup-only for previously synced orgs without a watermark", () => {
    const plan = planGoogleSheetSync({
      saved: null,
      watermark: null,
      rowCount: 1374,
      previouslySynced: true,
    });
    expect(plan.mode).toBe("catchup");
    expect(plan.indices[0]).toBe(1374 - SHEET_SYNC_CATCHUP_TAIL);
    expect(plan.indices).toHaveLength(SHEET_SYNC_CATCHUP_TAIL);
    expect(plan.indices[0]).not.toBe(0);
    expect(plan.indices[0]).not.toBe(300);
  });

  it("full import only when never synced", () => {
    const plan = planGoogleSheetSync({
      saved: null,
      watermark: null,
      rowCount: 100,
      previouslySynced: false,
    });
    expect(plan.mode).toBe("full");
    expect(plan.indices[0]).toBe(0);
    expect(plan.indices).toHaveLength(100);
  });
});

describe("advanceSheetSyncProgress", () => {
  it("advances contiguous body cursor", () => {
    const next = advanceSheetSyncProgress(
      { cursor: 10, total: 100, bodyEnd: 100 },
      10,
    );
    expect(next.cursor).toBe(11);
  });

  it("advances tail cursor for appended rows", () => {
    let progress = {
      cursor: 720,
      total: 897,
      bodyEnd: 800,
      tailCursor: 800,
    };
    progress = advanceSheetSyncProgress(progress, 800);
    progress = advanceSheetSyncProgress(progress, 801);
    expect(progress.tailCursor).toBe(802);
    expect(progress.cursor).toBe(720);
    expect(isSheetSyncComplete(progress)).toBe(false);
  });
});

describe("sheet sync progress helpers", () => {
  it("reads in-progress cursor", () => {
    expect(
      readSheetSyncProgress({ syncCursor: 100, syncTotal: 897 }),
    ).toEqual({ cursor: 100, total: 897 });
  });

  it("persists watermark after a completed sync", () => {
    const merged = mergeSheetSyncProgress(
      { spreadsheetId: "abc", syncCursor: 100, syncTotal: 897 },
      null,
      { watermarkTotal: 1374 },
    );
    expect(merged.syncCursor).toBeUndefined();
    expect(readSheetSyncWatermark(merged)).toBe(1374);
  });

  it("clears progress and watermark for a full re-import", () => {
    expect(
      clearSheetSyncProgress({
        spreadsheetId: "abc",
        syncCursor: 100,
        syncTotal: 897,
        syncWatermarkTotal: 1374,
      }),
    ).toEqual({ spreadsheetId: "abc" });
  });

  it("formats imported/total for UI (not body cursor alone)", () => {
    expect(
      formatSheetSyncProgressLabel({
        cursor: 720,
        total: 897,
        bodyEnd: 800,
        tailCursor: 850,
      }),
    ).toBe("770/897");
  });
});
