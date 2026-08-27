import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  isSpreadsheetFileName,
  parseGoogleSheetId,
  workbookFromSpreadsheetBuffer,
} from "./workbook-file";

function xlsxBuffer(rows: unknown[][], sheetName = "Records"): ArrayBuffer {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), sheetName);
  const out = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return out;
}

describe("parseGoogleSheetId", () => {
  it("reads the id from a Gmail Sheet link", () => {
    expect(
      parseGoogleSheetId(
        "https://docs.google.com/spreadsheets/d/1AbCdefGhijkLMNOPQrstuv-wxyz0123456789/edit#gid=0",
      ),
    ).toBe("1AbCdefGhijkLMNOPQrstuv-wxyz0123456789");
  });

  it("accepts a raw id and ignores short paste", () => {
    expect(parseGoogleSheetId("1AbCdefGhijkLMNOPQrstu")).toBe(
      "1AbCdefGhijkLMNOPQrstu",
    );
    expect(parseGoogleSheetId("not-a-sheet")).toBeNull();
  });
});

describe("workbookFromSpreadsheetBuffer", () => {
  it("builds tabs from the header row", () => {
    const book = workbookFromSpreadsheetBuffer(
      xlsxBuffer([
        ["Title", "Status"],
        ["First record", "Open"],
      ]),
      "my-ops.xlsx",
    );
    expect(book.title).toBe("my-ops");
    expect(book.tabs.Records.headers).toEqual(["Title", "Status"]);
    expect(book.tabs.Records.rows[0]?.cells).toEqual({
      Title: "First record",
      Status: "Open",
    });
  });

  it("names blank headers so infer still gets columns", () => {
    const book = workbookFromSpreadsheetBuffer(
      xlsxBuffer([["Party", ""], ["SM Traders", "Raipur"]]),
      "parties.csv",
    );
    expect(book.tabs.Records.headers).toEqual(["Party", "Column B"]);
  });

  it("rejects an empty workbook", () => {
    expect(() =>
      workbookFromSpreadsheetBuffer(xlsxBuffer([[], []]), "empty.xlsx"),
    ).toThrow(/no tables/i);
  });
});

describe("isSpreadsheetFileName", () => {
  it("allows csv and excel", () => {
    expect(isSpreadsheetFileName("stock.XLSX")).toBe(true);
    expect(isSpreadsheetFileName("notes.pdf")).toBe(false);
  });
});
