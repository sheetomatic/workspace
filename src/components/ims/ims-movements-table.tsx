"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type MovementRow = {
  id: string;
  itemId: string;
  createdAt: string;
  movementType: string;
  itemCode: string;
  itemName: string;
  uom: string;
  quantity: number;
  reference: string | null;
  poNumber: string | null;
  supplierName: string | null;
  invoiceNumber: string | null;
  attachmentId: string | null;
  by: string;
};

const MOVEMENT_LABELS: Record<string, string> = {
  RM_IN: "RM In",
  ISSUE_TO_PRODUCTION: "Issue to production",
  FG_IN: "FG In",
  FG_OUT: "FG Out",
  QC_PASS: "QC pass",
  QC_FAIL: "QC fail",
  ADJUSTMENT: "Adjustment",
};

const PAGE_SIZE = 50;

function toCsvCell(value: string | number | null): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function exportMovementsCsv(rows: MovementRow[]) {
  const header = [
    "When",
    "Item code",
    "Item name",
    "Type",
    "Quantity",
    "UoM",
    "PO number",
    "Supplier",
    "Invoice",
    "Reference",
    "By",
  ];
  const lines = rows.map((row) =>
    [
      new Date(row.createdAt).toLocaleString("en-IN"),
      row.itemCode,
      row.itemName,
      MOVEMENT_LABELS[row.movementType] ?? row.movementType,
      row.quantity,
      row.uom,
      row.poNumber,
      row.supplierName,
      row.invoiceNumber,
      row.reference,
      row.by,
    ]
      .map(toCsvCell)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ims-movements-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ImsMovementsTable({
  rows,
  totalCount,
}: {
  rows: MovementRow[];
  totalCount?: number;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (typeFilter !== "ALL" && row.movementType !== typeFilter) {
        return false;
      }
      if (term) {
        return (
          row.itemCode.toLowerCase().includes(term) ||
          row.itemName.toLowerCase().includes(term) ||
          (row.reference ?? "").toLowerCase().includes(term) ||
          (row.poNumber ?? "").toLowerCase().includes(term) ||
          (row.supplierName ?? "").toLowerCase().includes(term) ||
          (row.invoiceNumber ?? "").toLowerCase().includes(term) ||
          row.by.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [rows, search, typeFilter]);

  const visible = filtered.slice(0, visibleCount);
  const truncated =
    typeof totalCount === "number" && totalCount > rows.length;

  return (
    <div className="ws-ims-movements">
      <div className="ws-ims-filters">
        <input
          type="search"
          placeholder="Search item, reference, or user"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="ws-ims-filter-search"
        />
        <select
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
        >
          <option value="ALL">All movements</option>
          {Object.entries(MOVEMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ws-btn-secondary ws-btn-small"
          onClick={() => exportMovementsCsv(filtered)}
          disabled={filtered.length === 0}
        >
          Export CSV
        </button>
      </div>

      <p className="ws-ims-help">
        Showing {Math.min(visible.length, filtered.length)} of {filtered.length}
        {filtered.length !== rows.length ? ` (filtered from ${rows.length})` : ""}{" "}
        movements.
        {truncated
          ? ` Loaded the latest ${rows.length} of ${totalCount} total - export or filter to dig deeper.`
          : ""}
      </p>

      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table ws-ims-table-responsive">
          <thead>
            <tr>
              <th>When</th>
              <th>Item</th>
              <th>Type</th>
              <th>Qty</th>
              <th>PO / Supplier</th>
              <th>Invoice</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>No movements match these filters.</td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.id}>
                  <td data-label="When">
                    {new Date(row.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td data-label="Item">
                    <Link href={`/app/ims/items/${row.itemId}`}>
                      {row.itemCode}
                    </Link>{" "}
                    - {row.itemName}
                  </td>
                  <td data-label="Type">
                    {MOVEMENT_LABELS[row.movementType] ?? row.movementType}
                  </td>
                  <td data-label="Qty">
                    {row.quantity.toLocaleString("en-IN")} {row.uom}
                  </td>
                  <td data-label="PO / Supplier">
                    {row.poNumber || row.supplierName ? (
                      <>
                        {row.poNumber ?? "-"}
                        {row.supplierName ? (
                          <small className="ws-ims-cell-sub">{row.supplierName}</small>
                        ) : null}
                      </>
                    ) : (
                      row.reference ?? "-"
                    )}
                  </td>
                  <td data-label="Invoice">
                    {row.invoiceNumber ?? "-"}
                    {row.attachmentId ? (
                      <>
                        {" "}
                        <a
                          href={`/api/ims/attachments/${row.attachmentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ws-ims-link"
                        >
                          View
                        </a>
                      </>
                    ) : null}
                  </td>
                  <td data-label="By">{row.by}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {visible.length < filtered.length ? (
        <div className="ws-ims-form-actions">
          <button
            type="button"
            className="ws-btn-secondary"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Load more ({filtered.length - visible.length} remaining)
          </button>
        </div>
      ) : null}
    </div>
  );
}
