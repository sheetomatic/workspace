import { describe, expect, it } from "vitest";
import { parseSheetDate } from "@/lib/integrations/google-sheets-parse";

describe("parseSheetDate", () => {
  it("parses DD/MM/YYYY HH:MM:SS from Google Form timestamp", () => {
    const date = parseSheetDate("09/01/2023 20:58:43");
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2023);
    expect(date?.getMonth()).toBe(0);
    expect(date?.getDate()).toBe(9);
    expect(date?.getHours()).toBe(20);
    expect(date?.getMinutes()).toBe(58);
  });
});
