"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useActionState } from "react";
import {
  ImsVendorForm,
  type ImsVendorFormData,
} from "@/components/ims/ims-vendor-form";
import {
  deleteImsVendorAction,
  moveImsVendorAction,
  type ImsActionState,
} from "@/app/app/ims/actions";
import type { FormLayout } from "@/lib/ims/form-fields";

const initialState: ImsActionState = { ok: false, message: "" };

function ImsVendorRowActions({
  vendor,
  editing,
  onEditToggle,
  canReorder,
  isFirst,
  isLast,
}: {
  vendor: ImsVendorFormData;
  editing: boolean;
  onEditToggle: () => void;
  canReorder: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [moveState, moveAction] = useActionState(moveImsVendorAction, initialState);
  const [deleteState, deleteAction] = useActionState(
    deleteImsVendorAction,
    initialState,
  );

  return (
    <div className="ws-ims-row-actions">
      {canReorder ? (
        <form action={moveAction} className="ws-ims-row-move">
          <input type="hidden" name="id" value={vendor.id} />
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
              `Delete ${vendor.code}? This cannot be undone.`,
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={vendor.id} />
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

export function ImsVendorsManager({
  vendors,
  layout,
  canManage = true,
}: {
  vendors: ImsVendorFormData[];
  layout: FormLayout;
  canManage?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ACTIVE");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vendors.filter((vendor) => {
      if (activeFilter === "ACTIVE" && !vendor.isActive) {
        return false;
      }
      if (activeFilter === "INACTIVE" && vendor.isActive) {
        return false;
      }
      if (term) {
        return (
          vendor.code.toLowerCase().includes(term) ||
          vendor.name.toLowerCase().includes(term) ||
          (vendor.contactName ?? "").toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [vendors, search, activeFilter]);

  const canReorder = canManage && !search.trim() && activeFilter === "ALL";
  const colCount = canManage ? 7 : 6;

  return (
    <div className="ws-ims-items">
      <div className="ws-ims-filters">
        <input
          type="search"
          placeholder="Search code, name, or contact"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="ws-ims-filter-search"
        />
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
        Showing {filtered.length} of {vendors.length} vendors.
        {canReorder
          ? " Use the arrows to reorder."
          : " Clear search and set status to All to reorder vendors."}
      </p>

      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table ws-ims-table-responsive">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Email / Phone</th>
              <th>Lead time</th>
              <th>Status</th>
              {canManage ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount}>No vendors match these filters.</td>
              </tr>
            ) : (
              filtered.map((vendor, index) => (
                <Fragment key={vendor.id}>
                  <tr className={vendor.isActive ? "" : "ws-ims-row-inactive"}>
                    <td data-label="Code">
                      <Link href={`/app/ims/vendors/${vendor.id}`}>
                        {vendor.code}
                      </Link>
                    </td>
                    <td data-label="Name">{vendor.name}</td>
                    <td data-label="Contact">{vendor.contactName ?? "-"}</td>
                    <td data-label="Email / Phone">
                      {vendor.email ?? "-"}
                      {vendor.phone ? (
                        <small className="ws-ims-cell-sub">{vendor.phone}</small>
                      ) : null}
                    </td>
                    <td data-label="Lead time">
                      {vendor.leadTimeDays !== null
                        ? `${vendor.leadTimeDays} days`
                        : "-"}
                    </td>
                    <td data-label="Status">
                      {vendor.isActive ? "Active" : "Inactive"}
                    </td>
                    {canManage ? (
                      <td data-label="Actions">
                        <ImsVendorRowActions
                          vendor={vendor}
                          editing={editingId === vendor.id}
                          onEditToggle={() =>
                            setEditingId((current) =>
                              current === vendor.id ? null : vendor.id,
                            )
                          }
                          canReorder={canReorder}
                          isFirst={index === 0}
                          isLast={index === filtered.length - 1}
                        />
                      </td>
                    ) : null}
                  </tr>
                  {canManage && editingId === vendor.id ? (
                    <tr className="ws-ims-edit-row">
                      <td colSpan={colCount}>
                        <ImsVendorForm layout={layout} vendor={vendor} />
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
