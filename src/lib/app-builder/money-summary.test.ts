import { describe, expect, it } from "vitest";
import { TEMPLATES } from "./templates";
import { parseSheetDate, rowInRange, rupee, summarizeMoney } from "./money-summary";

const cashbook = TEMPLATES.find((t) => t.id === "cashbook");

describe("cashbook money summary", () => {
  it("parses DD/MM/YYYY", () => {
    const date = parseSheetDate("10/08/2026");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(7);
    expect(date?.getDate()).toBe(10);
  });

  it("keeps this-month rows and drops others", () => {
    const now = new Date(2026, 7, 20);
    expect(rowInRange(parseSheetDate("10/08/2026"), "month", now)).toBe(true);
    expect(rowInRange(parseSheetDate("10/07/2026"), "month", now)).toBe(false);
    expect(rowInRange(parseSheetDate("10/07/2026"), "all", now)).toBe(true);
  });

  it("totals credits, debits, net, and category split for Cashbook", () => {
    expect(cashbook).toBeTruthy();
    const now = new Date(2026, 7, 20);
    const summary = summarizeMoney(cashbook!.workbook, cashbook!.config.views, "month", now);
    expect(summary.credits).toBe(185000);
    expect(summary.debits).toBe(37200);
    expect(summary.net).toBe(147800);
    expect(summary.byCategory.some((row) => row.label === "Sales" && row.amount === 143000)).toBe(
      true,
    );
    expect(rupee(summary.net)).toBe("₹1,47,800");
  });
});
