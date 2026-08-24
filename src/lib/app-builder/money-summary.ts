import type { AppView, CellValue, SheetRow, SheetWorkbook } from "./index";
import { cellStr } from "./index";

export type MoneyRange = "all" | "week" | "month";

const AMOUNT_COL = /^(amount|value|total|credit|debit)$/i;

export function parseSheetDate(value: CellValue): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3]);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function dateColOf(view: AppView): string | undefined {
  return view.cols.find((col) => /date/i.test(col));
}

export function amountColOf(view: AppView): string | undefined {
  return view.cols.find((col) => AMOUNT_COL.test(col));
}

export function categoryColOf(view: AppView): string | undefined {
  return view.cols.find((col) => /category|from|paid to/i.test(col) && !AMOUNT_COL.test(col));
}

export function isMoneyView(view: AppView): boolean {
  return Boolean(amountColOf(view)) && !/categor/i.test(view.name);
}

export function rowInRange(date: Date | null, range: MoneyRange, now: Date): boolean {
  if (range === "all") return true;
  if (!date) return false;
  if (range === "month") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

function amountOf(row: SheetRow, col: string): number {
  const raw = row.cells[col];
  if (typeof raw === "number") return raw;
  const n = Number(String(raw ?? "").replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function sideOf(view: AppView): "in" | "out" {
  if (/credit|in|receipt|sale/i.test(view.name) || /credit|in|receipt/i.test(view.tab)) {
    return "in";
  }
  return "out";
}

export type MoneySummary = {
  credits: number;
  debits: number;
  net: number;
  byCategory: { label: string; amount: number; side: "in" | "out" }[];
};

export function summarizeMoney(
  workbook: SheetWorkbook,
  views: AppView[],
  range: MoneyRange,
  now = new Date(),
): MoneySummary {
  let credits = 0;
  let debits = 0;
  const cats = new Map<string, { amount: number; side: "in" | "out" }>();

  for (const view of views.filter(isMoneyView)) {
    const amountCol = amountColOf(view);
    if (!amountCol) continue;
    const dateCol = dateColOf(view);
    const catCol = view.cols.find((col) => /^category$/i.test(col));
    const side = sideOf(view);
    const rows = workbook.tabs[view.tab]?.rows ?? [];
    for (const row of rows) {
      const date = dateCol ? parseSheetDate(row.cells[dateCol]) : null;
      if (range !== "all" && !rowInRange(date, range, now)) continue;
      const amount = amountOf(row, amountCol);
      if (side === "in") credits += amount;
      else debits += amount;
      if (catCol) {
        const label = cellStr(row, catCol) || "Uncategorised";
        const key = `${side}:${label}`;
        const prev = cats.get(key) || { amount: 0, side };
        cats.set(key, { amount: prev.amount + amount, side });
      }
    }
  }

  const byCategory = [...cats.entries()]
    .map(([key, value]) => ({
      label: key.slice(key.indexOf(":") + 1),
      amount: value.amount,
      side: value.side,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { credits, debits, net: credits - debits, byCategory };
}

export function rupee(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-IN");
  return n < 0 ? `−₹${abs}` : `₹${abs}`;
}
