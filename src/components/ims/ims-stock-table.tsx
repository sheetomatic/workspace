"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatImsCurrency,
  formatImsQty,
  IMS_STOCK_STATUS_LABELS,
  type ImsStockStatus,
} from "@/lib/ims/stock-status";

export type StockTableRow = {
  id: string;
  code: string;
  name: string;
  itemType: "RAW_MATERIAL" | "FINISHED_GOOD";
  category: string | null;
  storeType: string;
  uom: string;
  usableQty: number;
  qcPendingQty: number;
  minQty: number;
  reorderQty: number;
  maxQty: number;
  value: number;
  status: ImsStockStatus;
  isActive: boolean;
};

function toCsv(rows: StockTableRow[]) {
  const header = [
    "Code",
    "Name",
    "Type",
    "Category",
    "Store",
    "UOM",
    "Usable",
    "QC pending",
    "Min",
    "Reorder",
    "Max",
    "Unit value",
    "Status",
    "Active",
  ];
  const lines = rows.map((row) =>
    [
      row.code,
      row.name,
      row.itemType === "RAW_MATERIAL" ? "RM" : "FG",
      row.category ?? "",
      row.storeType,
      row.uom,
      row.usableQty,
      row.qcPendingQty,
      row.minQty,
      row.reorderQty,
      row.maxQty,
      row.value,
      IMS_STOCK_STATUS_LABELS[row.status],
      row.isActive ? "Active" : "Inactive",
    ]
      .map((cell) => {
        const value = String(cell ?? "");
        return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
      })
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function ImsStockTable({ rows }: { rows: StockTableRow[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (row.category) {
        set.add(row.category);
      }
    }
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (typeFilter !== "ALL" && row.itemType !== typeFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && row.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== "ALL" && (row.category ?? "") !== categoryFilter) {
        return false;
      }
      if (term) {
        return (
          row.code.toLowerCase().includes(term) ||
          row.name.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [rows, search, typeFilter, statusFilter, categoryFilter]);

  function downloadCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ws-ims-stock">
      <div className="ws-ims-filters">
        <input
          type="search"
          placeholder="Search code or name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="ws-ims-filter-search"
        />
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="ALL">All types</option>
          <option value="RAW_MATERIAL">Raw material</option>
          <option value="FINISHED_GOOD">Finished good</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="ALL">All status</option>
          <option value="red">Below minimum</option>
          <option value="orange">Approaching low</option>
          <option value="green">Healthy</option>
          <option value="blue">Above maximum</option>
        </select>
        {categories.length > 0 ? (
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="ALL">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        ) : null}
        <button type="button" className="ws-btn-secondary" onClick={downloadCsv}>
          Export CSV
        </button>
      </div>

      <p className="ws-ims-help">
        Showing {filtered.length} of {rows.length} items.
      </p>

      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table ws-ims-table-responsive">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Store</th>
              <th>Usable</th>
              <th>QC pending</th>
              <th>Min</th>
              <th>Reorder</th>
              <th>Max</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10}>No stock records match these filters.</td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className={row.isActive ? "" : "ws-ims-row-inactive"}>
                  <td data-label="Code">
                    <Link href={`/app/ims/items/${row.id}`}>{row.code}</Link>
                  </td>
                  <td data-label="Name">
                    {row.name}
                    {row.isActive ? "" : " (inactive)"}
                  </td>
                  <td data-label="Store">{row.storeType}</td>
                  <td data-label="Usable">{formatImsQty(row.usableQty, row.uom)}</td>
                  <td data-label="QC pending">
                    {formatImsQty(row.qcPendingQty, row.uom)}
                  </td>
                  <td data-label="Min">{formatImsQty(row.minQty)}</td>
                  <td data-label="Reorder">{formatImsQty(row.reorderQty)}</td>
                  <td data-label="Max">{formatImsQty(row.maxQty)}</td>
                  <td data-label="Value">{formatImsCurrency(row.value)}</td>
                  <td data-label="Status">
                    <span className={`ws-ims-pill ws-ims-pill-${row.status}`}>
                      {IMS_STOCK_STATUS_LABELS[row.status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
