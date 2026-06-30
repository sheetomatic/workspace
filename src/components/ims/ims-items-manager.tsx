"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useActionState } from "react";
import {
  ImsItemForm,
  type ImsItemFormData,
} from "@/components/ims/ims-item-form";
import {
  deleteImsItemAction,
  moveImsItemAction,
  type ImsActionState,
} from "@/app/app/ims/actions";
import type { FormLayout } from "@/lib/ims/form-fields";
import { formatImsCurrency, formatImsQty } from "@/lib/ims/stock-status";

const initialState: ImsActionState = { ok: false, message: "" };

function ImsItemRowActions({
  item,
  editing,
  onEditToggle,
  canReorder,
  isFirst,
  isLast,
}: {
  item: ImsItemFormData;
  editing: boolean;
  onEditToggle: () => void;
  canReorder: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [moveState, moveAction] = useActionState(moveImsItemAction, initialState);
  const [deleteState, deleteAction] = useActionState(
    deleteImsItemAction,
    initialState,
  );

  return (
    <div className="ws-ims-row-actions">
      {canReorder ? (
        <form action={moveAction} className="ws-ims-row-move">
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            name="direction"
            value="up"
            className="ws-ims-icon-btn"
            disabled={isFirst}
            aria-label="Move up"
            title="Move up"
          >
            {"\u2191"}
          </button>
          <button
            type="submit"
            name="direction"
            value="down"
            className="ws-ims-icon-btn"
            disabled={isLast}
            aria-label="Move down"
            title="Move down"
          >
            {"\u2193"}
          </button>
        </form>
      ) : null}

      <button
        type="button"
        className="ws-btn-secondary ws-btn-small"
        onClick={onEditToggle}
      >
        {editing ? "Close" : "Edit"}
      </button>

      <form
        action={deleteAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `Delete ${item.code}? This cannot be undone. Items with stock or history cannot be deleted.`,
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={item.id} />
        <button type="submit" className="ws-btn-danger ws-btn-small">
          Delete
        </button>
      </form>

      {deleteState.message && !deleteState.ok ? (
        <span className="ws-ims-row-error">{deleteState.message}</span>
      ) : null}
      {moveState.message && !moveState.ok ? (
        <span className="ws-ims-row-error">{moveState.message}</span>
      ) : null}
    </div>
  );
}

export function ImsItemsManager({
  items,
  layout,
  canManage = true,
  categoryOptions,
}: {
  items: ImsItemFormData[];
  layout: FormLayout;
  canManage?: boolean;
  categoryOptions?: string[];
}) {
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

  const canReorder =
    canManage &&
    !search.trim() &&
    typeFilter === "ALL" &&
    categoryFilter === "ALL" &&
    activeFilter === "ALL";

  const colCount = canManage ? 10 : 9;

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
        {canReorder
          ? " Use the arrows to reorder."
          : " Clear search and filters (set type, category, and status to All) to reorder items."}
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
              {canManage ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount}>No items match these filters.</td>
              </tr>
            ) : (
              filtered.map((item, index) => (
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
                    {canManage ? (
                      <td data-label="Actions">
                        <ImsItemRowActions
                          item={item}
                          editing={editingId === item.id}
                          onEditToggle={() =>
                            setEditingId((current) =>
                              current === item.id ? null : item.id,
                            )
                          }
                          canReorder={canReorder}
                          isFirst={index === 0}
                          isLast={index === filtered.length - 1}
                        />
                      </td>
                    ) : null}
                  </tr>
                  {canManage && editingId === item.id ? (
                    <tr className="ws-ims-edit-row">
                      <td colSpan={colCount}>
                        <ImsItemForm
                          layout={layout}
                          item={item}
                          categoryOptions={categoryOptions ?? categories}
                        />
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
