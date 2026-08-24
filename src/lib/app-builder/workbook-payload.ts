import type { CellValue, SheetWorkbook } from "./index";

function asCell(value: unknown): CellValue {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  return String(value).slice(0, 500);
}

export function workbookFromClient(raw: unknown): SheetWorkbook | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as { title?: unknown; tabs?: unknown };
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 80) : "";
  if (!title || !input.tabs || typeof input.tabs !== "object" || Array.isArray(input.tabs)) {
    return null;
  }
  const names = Object.keys(input.tabs).slice(0, 12);
  if (names.length === 0) return null;
  const tabs: SheetWorkbook["tabs"] = {};
  for (const name of names) {
    const tab = (input.tabs as Record<string, unknown>)[name];
    if (!tab || typeof tab !== "object") return null;
    const headersRaw = (tab as { headers?: unknown }).headers;
    if (!Array.isArray(headersRaw) || headersRaw.length === 0) return null;
    const headers = headersRaw
      .map((h) => String(h ?? "").trim())
      .filter(Boolean)
      .slice(0, 26);
    if (headers.length === 0) return null;
    const rowsRaw = (tab as { rows?: unknown }).rows;
    const rows = Array.isArray(rowsRaw) ? rowsRaw.slice(0, 100) : [];
    tabs[name.slice(0, 31)] = {
      name: name.slice(0, 31),
      headers,
      rows: rows.map((row, index) => {
        const cellsIn =
          row && typeof row === "object" && "cells" in row && (row as { cells?: unknown }).cells
            ? ((row as { cells: Record<string, unknown> }).cells ?? {})
            : row && typeof row === "object"
              ? (row as Record<string, unknown>)
              : {};
        const cells: Record<string, CellValue> = {};
        for (const header of headers) {
          cells[header] = asCell(cellsIn[header]);
        }
        return { _row: index + 2, cells };
      }),
    };
  }
  return { title, tabs };
}
