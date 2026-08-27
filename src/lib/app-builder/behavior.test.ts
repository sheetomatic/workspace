import { describe, expect, it } from "vitest";
import {
  actionShown,
  applySliceFilter,
  fieldRequired,
  fieldShown,
  fieldValid,
  formatCell,
} from "./behavior";
import { createEmptyConfig } from "./index";

const user = { id: "s", name: "Asha", pin: "2222", role: "user" as const, email: "asha@firm.com" };

describe("column behavior", () => {
  it("Show_if, Required_if, and Valid_if use AppSheet formulas", () => {
    const row = { Stage: "Won", Qty: 2, Email: "asha@firm.com" };
    expect(fieldShown({ name: "n", label: "N", col: "Note", showIf: '[Stage]="Won"' }, row, user)).toBe(
      true,
    );
    expect(fieldShown({ name: "n", label: "N", col: "Note", showIf: '[Stage]="Open"' }, row, user)).toBe(
      false,
    );
    expect(
      fieldRequired({ name: "q", label: "Qty", col: "Qty", requiredIf: "[Qty]>0" }, row, user),
    ).toBe(true);
    expect(fieldValid({ name: "q", label: "Qty", col: "Qty", validIf: "[Qty]>0" }, 2, row, user).ok).toBe(
      true,
    );
    expect(
      fieldValid(
        { name: "q", label: "Qty", col: "Qty", validIf: "[Qty]>5", invalidMessage: "Need more" },
        2,
        row,
        user,
      ),
    ).toEqual({ ok: false, message: "Need more" });
  });

  it("hides an action when Only if is false or position is Hide", () => {
    const row = { Stage: "Open" };
    expect(
      actionShown({ id: "1", label: "Done", viewId: "v", steps: [], onlyIf: '[Stage]="Won"' }, row),
    ).toBe(false);
    expect(
      actionShown({ id: "1", label: "Done", viewId: "v", steps: [], position: "hide" }, row),
    ).toBe(false);
    expect(actionShown({ id: "1", label: "Done", viewId: "v", steps: [] }, row)).toBe(true);
  });
});

describe("slice and format", () => {
  it("filters rows with a slice formula", () => {
    const config = createEmptyConfig("Desk");
    config.slices = [{ id: "direct", name: "Direct Sale", tab: "Menu", filter: '[Category]="Direct Sale"' }];
    config.views = [
      {
        id: "menu",
        hub: "App",
        name: "Menu",
        kind: "deck",
        tab: "Menu",
        cols: ["Name", "Category"],
        sliceId: "direct",
      },
    ];
    const rows = [
      { _row: 2, cells: { Name: "Pipe", Category: "Direct Sale" } },
      { _row: 3, cells: { Name: "Coil", Category: "Stock" } },
    ];
    expect(applySliceFilter(rows, config.views[0], config).map((row) => row.cells.Name)).toEqual([
      "Pipe",
    ]);
  });

  it("formats number, currency, and date", () => {
    expect(formatCell(12000, { kind: "currency", currency: "INR", decimals: 0 })).toBe("₹12,000");
    expect(formatCell(12.5, { kind: "number", decimals: 1 })).toBe("12.5");
    expect(formatCell("15/08/2026", { kind: "date", dateStyle: "short" })).toMatch(/15/);
  });
});
