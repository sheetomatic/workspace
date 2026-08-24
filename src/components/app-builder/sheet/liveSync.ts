import type { CellValue } from "@/lib/app-builder";
import type { SheetAdapter } from "./mockAdapter";

type Mutation =
  | { action: "append"; tab: string; headers: string[]; cells: Record<string, CellValue> }
  | { action: "update"; tab: string; headers: string[]; row: number; cells: Record<string, CellValue> }
  | { action: "delete"; tab: string; row: number };

export function withLiveSheetSync(
  adapter: SheetAdapter,
  getSpreadsheetId: () => string | null,
): SheetAdapter {
  function push(mutation: Mutation) {
    const spreadsheetId = getSpreadsheetId();
    if (!spreadsheetId) return;
    void fetch("/api/app-builder/google/workbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spreadsheetId, ...mutation }),
    });
  }

  return {
    ...adapter,
    appendRow(tab, cells) {
      const row = adapter.appendRow(tab, cells);
      push({
        action: "append",
        tab,
        headers: adapter.getTab(tab)?.headers || Object.keys(cells),
        cells,
      });
      return row;
    },
    updateRow(tab, rowNum, cells) {
      const row = adapter.updateRow(tab, rowNum, cells);
      push({
        action: "update",
        tab,
        headers: adapter.getTab(tab)?.headers || Object.keys(row.cells),
        row: rowNum,
        cells: row.cells,
      });
      return row;
    },
    setCell(tab, rowNum, col, value) {
      adapter.setCell(tab, rowNum, col, value);
      const found = adapter.listRows(tab).find((r) => r._row === rowNum);
      push({
        action: "update",
        tab,
        headers: adapter.getTab(tab)?.headers || [col],
        row: rowNum,
        cells: found?.cells || { [col]: value },
      });
    },
    deleteRow(tab, rowNum) {
      adapter.deleteRow(tab, rowNum);
      push({ action: "delete", tab, row: rowNum });
    },
  };
}
