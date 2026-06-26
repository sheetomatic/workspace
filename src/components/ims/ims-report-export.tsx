"use client";

import type { ImsReportData } from "@/lib/ims/ims-store";

function toCsvCell(value: string | number | null): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ImsReportExport({ data }: { data: ImsReportData }) {
  function exportValuation() {
    const header = ["Category", "Items", "Stock value (INR)"];
    const lines = data.categoryValuation.map((row) =>
      [row.category, row.itemCount, Math.round(row.value)].map(toCsvCell).join(","),
    );
    const stamp = new Date().toISOString().slice(0, 10);
    download(
      `ims-valuation-${stamp}.csv`,
      [header.join(","), ...lines].join("\n"),
    );
  }

  return (
    <button
      type="button"
      className="ws-btn-secondary ws-btn-small"
      onClick={exportValuation}
      disabled={data.categoryValuation.length === 0}
    >
      Export valuation CSV
    </button>
  );
}
