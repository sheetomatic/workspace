import { describe, expect, it } from "vitest";
import { buildMsmeWorkbookAoa } from "@/lib/learn/msme-workbook";
import { SHEETS_TEACHING } from "@/lib/learn/sheets-teaching";

describe("Sheets teaching pack", () => {
  it("covers all 58 curriculum topics", () => {
    expect(SHEETS_TEACHING).toHaveLength(58);
    expect(SHEETS_TEACHING.map((item) => item.no)).toEqual(
      Array.from({ length: 58 }, (_, index) => index + 1),
    );
  });

  it("builds a fat MSME sales register", () => {
    const tabs = buildMsmeWorkbookAoa();
    expect(tabs.meta.salesLines).toBeGreaterThan(1000);
    expect(tabs.meta.products).toBeGreaterThan(20);
    expect(tabs.Practice.length).toBeGreaterThan(20);
  });
});
