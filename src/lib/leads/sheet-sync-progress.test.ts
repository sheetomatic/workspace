import { describe, expect, it } from "vitest";
import {
  clearSheetSyncProgress,
  mergeSheetSyncProgress,
  readSheetSyncProgress,
  resolveSheetSyncResumeCursor,
} from "@/lib/leads/sheet-sync-progress";

describe("resolveSheetSyncResumeCursor", () => {
  it("resumes at saved cursor when total is unchanged", () => {
    expect(
      resolveSheetSyncResumeCursor({ cursor: 400, total: 800 }, 800),
    ).toBe(400);
  });

  it("does not reset to 0 when the sheet grows", () => {
    expect(
      resolveSheetSyncResumeCursor({ cursor: 720, total: 800 }, 897),
    ).toBe(720);
  });

  it("restarts when the sheet shrinks", () => {
    expect(
      resolveSheetSyncResumeCursor({ cursor: 400, total: 800 }, 200),
    ).toBe(0);
  });

  it("starts at 0 with no saved progress", () => {
    expect(resolveSheetSyncResumeCursor(null, 897)).toBe(0);
  });
});

describe("sheet sync progress helpers", () => {
  it("reads in-progress cursor", () => {
    expect(
      readSheetSyncProgress({ syncCursor: 100, syncTotal: 897 }),
    ).toEqual({ cursor: 100, total: 897 });
  });

  it("clears progress for a full re-import", () => {
    expect(
      clearSheetSyncProgress({
        spreadsheetId: "abc",
        syncCursor: 100,
        syncTotal: 897,
      }),
    ).toEqual({ spreadsheetId: "abc" });
  });

  it("merges partial progress", () => {
    expect(
      mergeSheetSyncProgress({ spreadsheetId: "abc" }, { cursor: 200, total: 897 }),
    ).toEqual({
      spreadsheetId: "abc",
      syncCursor: 200,
      syncTotal: 897,
    });
  });
});
