import * as XLSX from "xlsx";
import type { CellValue, SheetTab, SheetWorkbook } from "./index";

export const SPREADSHEET_MAX_BYTES = 8 * 1024 * 1024;
export const SPREADSHEET_ACCEPT =
  ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const ACCEPTED_EXT = new Set([".csv", ".xlsx", ".xls"]);

export function isSpreadsheetFileName(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return ACCEPTED_EXT.has(name.slice(dot).toLowerCase());
}

export function parseGoogleSheetId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const fromUrl = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  if (fromUrl) return fromUrl;
  if (/^[a-zA-Z0-9-_]{20,}$/.test(value)) return value;
  return null;
}

function cellValue(raw: unknown): CellValue {
  if (raw == null || raw === "") return "";
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "boolean") return raw;
  return String(raw);
}

function headerName(raw: unknown, index: number): string {
  const label = raw == null ? "" : String(raw).trim();
  return label || `Column ${XLSX.utils.encode_col(index)}`;
}

function tabFromSheet(name: string, sheet: XLSX.WorkSheet): SheetTab | null {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });
  const first = rows.find((row) =>
    row.some((cell) => String(cell ?? "").trim() !== ""),
  );
  if (!first) return null;
  const headerIndex = rows.indexOf(first);
  const headers = first.map((cell, i) => headerName(cell, i));
  const data = rows.slice(headerIndex + 1).filter((row) =>
    row.some((cell) => String(cell ?? "").trim() !== ""),
  );
  return {
    name,
    headers,
    rows: data.map((row, i) => ({
      _row: i + 2,
      cells: Object.fromEntries(
        headers.map((header, j) => [header, cellValue(row[j])]),
      ),
    })),
  };
}

export function workbookFromSpreadsheetBuffer(
  buffer: ArrayBuffer,
  fileName: string,
): SheetWorkbook {
  const book = XLSX.read(buffer, { type: "array", cellDates: true });
  const tabs: Record<string, SheetTab> = {};
  for (const name of book.SheetNames) {
    const sheet = book.Sheets[name];
    if (!sheet) continue;
    const tab = tabFromSheet(name, sheet);
    if (tab) tabs[tab.name] = tab;
  }
  if (!Object.keys(tabs).length) {
    throw new Error(
      "That file has no tables we can read. Use a header row in .xlsx, .xls, or .csv.",
    );
  }
  return {
    title: fileName.replace(/\.[^.]+$/, "") || "Uploaded Sheet",
    tabs,
  };
}

export async function workbookFromSpreadsheetFile(
  file: File,
): Promise<SheetWorkbook> {
  if (file.size > SPREADSHEET_MAX_BYTES) {
    throw new Error(
      "That file is over 8 MB. Export a smaller Sheet or one tab as CSV.",
    );
  }
  if (!isSpreadsheetFileName(file.name)) {
    throw new Error("Upload a .xlsx, .xls, or .csv file.");
  }
  return workbookFromSpreadsheetBuffer(await file.arrayBuffer(), file.name);
}
