import { describe, expect, it } from "vitest";
import { buildMsmeWorkbookAoa } from "@/lib/learn/msme-workbook";
import { PRACTICE_TABS } from "@/lib/learn/practice-workbook";
import { SHEETS_TEACHING } from "@/lib/learn/sheets-teaching";

describe("Sheets teaching pack", () => {
  it("covers all 58 curriculum topics", () => {
    expect(SHEETS_TEACHING).toHaveLength(58);
    expect(SHEETS_TEACHING.map((item) => item.no)).toEqual(
      Array.from({ length: 58 }, (_, index) => index + 1),
    );
  });

  it("points practice at real workbook tabs", () => {
    const named = SHEETS_TEACHING.filter((item) => item.tab);
    expect(named.length).toBeGreaterThan(40);
    for (const item of named) {
      expect(PRACTICE_TABS).toContain(item.tab);
      expect(item.practicePrompt).toContain(item.tab);
      expect(item.embedUrl).toContain("spreadsheets/d/");
    }
  });

  it("builds a fat MSME sales register", () => {
    const tabs = buildMsmeWorkbookAoa();
    expect(tabs.meta.salesLines).toBeGreaterThan(1000);
    expect(tabs.meta.products).toBeGreaterThan(20);
    expect(tabs.Practice.length).toBeGreaterThan(20);
    expect(tabs.Apply.length).toBeGreaterThan(1);
    expect(tabs.Analyst_Query.length).toBeGreaterThan(5);
    expect(tabs.Live_Filter.length).toBeGreaterThan(5);
    expect(tabs.Sell_More.length).toBeGreaterThan(5);
  });
});
