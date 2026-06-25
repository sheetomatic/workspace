"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import {
  ImsItemForm,
  type ImsItemFormData,
} from "@/components/ims/ims-item-form";
import { formatImsCurrency, formatImsQty } from "@/lib/ims/stock-status";

export function ImsItemsManager({ items }: { items: ImsItemFormData[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ACTIVE");
  const [editingId, setEditingId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category) {
        set.add(item.category);
      }
    }
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "ALL" && item.itemType !== typeFilter) {
        return false;
      }
      if (categoryFilter !== "ALL" && (item.category ?? "") !== categoryFilter) {
        return false;
      }
      if (activeFilter === "ACTIVE" && !item.isActive) {
        return false;
      }
      if (activeFilter === "INACTIVE" && item.isActive) {
        return false;
      }
      if (term) {
        return (
          item.code.toLowerCase().includes(term) ||
          item.name.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [items, search, typeFilter, categoryFilter, activeFilter]);

  return (
    <div className="ws-ims-items">
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
        <select
          value={activeFilter}
          onChange={(event) => setActiveFilter(event.target.value)}
        >
          <option value="ACTIVE">Active only</option>
          <option value="INACTIVE">Inactive only</option>
          <option value="ALL">All</option>
        </select>
      </div>

      <p className="ws-ims-help">
        Showing {filtered.length} of {items.length} items.
      </p>

      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table ws-ims-table-responsive">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Category</th>
              <th>ABC</th>
              <th>Min / Reorder / Max</th>
              <th>Cost</th>
              <th>QC</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10}>No items match these filters.</td>
              </tr>
            ) : (
              filtered.map((item) => (
                <Fragment key={item.id}>
                  <tr
                    className={item.isActive ? "" : "ws-ims-row-inactive"}
                  >
                    <td data-label="Code">
                      <Link href={`/app/ims/items/${item.id}`}>{item.code}</Link>
                    </td>
                    <td data-label="Name">{item.name}</td>
                    <td data-label="Type">
                      {item.itemType === "RAW_MATERIAL" ? "RM" : "FG"}
                    </td>
                    <td data-label="Category">{item.category ?? "-"}</td>
                    <td data-label="ABC">{item.abcClass}</td>
                    <td data-label="Min / Reorder / Max">
                      {formatImsQty(item.minQty)} / {formatImsQty(item.reorderQty)} /{" "}
                      {formatImsQty(item.maxQty)}
                    </td>
                    <td data-label="Cost">{formatImsCurrency(item.unitCost)}</td>
                    <td data-label="QC">{item.qcOnReceipt}</td>
                    <td data-label="Status">
                      {item.isActive ? "Active" : "Inactive"}
                    </td>
                    <td data-label="">
                      <button
                        type="button"
                        className="ws-btn-secondary ws-btn-small"
                        onClick={() =>
                          setEditingId((current) =>
                            current === item.id ? null : item.id,
                          )
                        }
                      >
                        {editingId === item.id ? "Close" : "Edit"}
                      </button>
                    </td>
                  </tr>
                  {editingId === item.id ? (
                    <tr className="ws-ims-edit-row">
                      <td colSpan={10}>
                        <ImsItemForm item={item} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
