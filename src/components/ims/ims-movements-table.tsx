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

export function ImsMovementsTable({ rows }: { rows: MovementRow[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

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
          row.by.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [rows, search, typeFilter]);

  return (
    <div className="ws-ims-movements">
      <div className="ws-ims-filters">
        <input
          type="search"
          placeholder="Search item, reference, or user"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="ws-ims-filter-search"
        />
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="ALL">All movements</option>
          {Object.entries(MOVEMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <p className="ws-ims-help">
        Showing {filtered.length} of {rows.length} movements.
      </p>

      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table ws-ims-table-responsive">
          <thead>
            <tr>
              <th>When</th>
              <th>Item</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Reference</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>No movements match these filters.</td>
              </tr>
            ) : (
              filtered.map((row) => (
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
                  <td data-label="Reference">{row.reference ?? "-"}</td>
                  <td data-label="By">{row.by}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
