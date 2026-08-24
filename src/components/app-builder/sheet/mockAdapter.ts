import {
  moveColumnHeaders,
  type CellValue,
  type SheetRow,
  type SheetTab,
  type SheetWorkbook,
} from "@/lib/app-builder";

function row(n: number, cells: Record<string, CellValue>): SheetRow {
  return { _row: n, cells };
}

function tab(name: string, headers: string[], rows: SheetRow[]): SheetTab {
  return { name, headers, rows };
}

/** In-memory workbook — stands in for Google Sheets until the add-on bridge. */
export function createDemoWorkbook(): SheetWorkbook {
  return {
    title: "Demo Orders Sheet",
    tabs: {
      Orders: tab(
        "Orders",
        ["Order No", "Date", "Party", "Status", "Amount"],
        [
          row(2, {
            "Order No": "SO-1001",
            Date: "18/08/2026",
            Party: "SM Traders",
            Status: "Open",
            Amount: 125000,
          }),
          row(3, {
            "Order No": "SO-1002",
            Date: "19/08/2026",
            Party: "East Steel",
            Status: "Dispatched",
            Amount: 84000,
          }),
          row(4, {
            "Order No": "SO-1003",
            Date: "19/08/2026",
            Party: "SM Traders",
            Status: "Open",
            Amount: 52000,
          }),
        ],
      ),
      "Order Lines": tab(
        "Order Lines",
        ["Order No", "Item", "Qty", "Rate", "Line Amount"],
        [
          row(2, {
            "Order No": "SO-1001",
            Item: "TMT 12mm",
            Qty: 10,
            Rate: 5200,
            "Line Amount": 52000,
          }),
          row(3, {
            "Order No": "SO-1001",
            Item: "TMT 16mm",
            Qty: 14,
            Rate: 5214,
            "Line Amount": 73000,
          }),
          row(4, {
            "Order No": "SO-1002",
            Item: "TMT 10mm",
            Qty: 20,
            Rate: 4200,
            "Line Amount": 84000,
          }),
          row(5, {
            "Order No": "SO-1003",
            Item: "TMT 8mm",
            Qty: 13,
            Rate: 4000,
            "Line Amount": 52000,
          }),
        ],
      ),
      Parties: tab(
        "Parties",
        ["Party Name", "Phone", "City"],
        [
          row(2, { "Party Name": "SM Traders", Phone: "9876543210", City: "Raipur" }),
          row(3, { "Party Name": "East Steel", Phone: "9123456780", City: "Bilaspur" }),
        ],
      ),
      Items: tab(
        "Items",
        ["Item", "Unit", "Rate"],
        [
          row(2, { Item: "TMT 8mm", Unit: "MT", Rate: 4000 }),
          row(3, { Item: "TMT 10mm", Unit: "MT", Rate: 4200 }),
          row(4, { Item: "TMT 12mm", Unit: "MT", Rate: 5200 }),
          row(5, { Item: "TMT 16mm", Unit: "MT", Rate: 5214 }),
        ],
      ),
    },
  };
}

export type SheetAdapter = {
  getWorkbook: () => SheetWorkbook;
  listRows: (tabName: string) => SheetRow[];
  getTab: (tabName: string) => SheetTab | null;
  appendRow: (tabName: string, cells: Record<string, CellValue>) => SheetRow;
  updateRow: (tabName: string, rowNum: number, cells: Record<string, CellValue>) => SheetRow;
  setCell: (tabName: string, rowNum: number, col: string, value: CellValue) => void;
  deleteRow: (tabName: string, rowNum: number) => void;
  addColumn: (tabName: string, col: string) => void;
  moveColumn: (tabName: string, col: string, direction: -1 | 1) => void;
  addTab: (tabName: string) => void;
  replace: (next: SheetWorkbook) => void;
};

export function createMockAdapter(seed?: SheetWorkbook): SheetAdapter {
  let book: SheetWorkbook = seed
    ? structuredClone(seed)
    : createDemoWorkbook();

  function ensureTab(tabName: string): SheetTab {
    if (!book.tabs[tabName]) {
      book.tabs[tabName] = { name: tabName, headers: [], rows: [] };
    }
    return book.tabs[tabName];
  }

  return {
    getWorkbook: () => book,
    getTab: (tabName) => book.tabs[tabName] ?? null,
    listRows: (tabName) => [...(book.tabs[tabName]?.rows ?? [])].sort((a, b) => b._row - a._row),
    appendRow: (tabName, cells) => {
      const t = ensureTab(tabName);
      for (const k of Object.keys(cells)) {
        if (!t.headers.includes(k)) t.headers.push(k);
      }
      const next = t.rows.reduce((m, r) => Math.max(m, r._row), 1) + 1;
      const rec = { _row: next, cells: { ...cells } };
      t.rows.push(rec);
      return rec;
    },
    updateRow: (tabName, rowNum, cells) => {
      const t = ensureTab(tabName);
      const found = t.rows.find((r) => r._row === rowNum);
      if (!found) throw new Error(`Row ${rowNum} not on ${tabName}`);
      found.cells = { ...found.cells, ...cells };
      return found;
    },
    setCell: (tabName, rowNum, col, value) => {
      const t = ensureTab(tabName);
      if (!t.headers.includes(col)) t.headers.push(col);
      const found = t.rows.find((r) => r._row === rowNum);
      if (!found) throw new Error(`Row ${rowNum} not on ${tabName}`);
      found.cells[col] = value;
    },
    deleteRow: (tabName, rowNum) => {
      const t = ensureTab(tabName);
      t.rows = t.rows.filter((r) => r._row !== rowNum);
    },
    addColumn: (tabName, col) => {
      const t = ensureTab(tabName);
      const name = col.trim();
      if (name && !t.headers.includes(name)) t.headers.push(name);
    },
    moveColumn: (tabName, col, direction) => {
      const t = ensureTab(tabName);
      t.headers = moveColumnHeaders(t.headers, col, direction);
    },
    addTab: (tabName) => {
      ensureTab(tabName.trim() || "Sheet");
    },
    replace: (next) => {
      book = structuredClone(next);
    },
  };
}
