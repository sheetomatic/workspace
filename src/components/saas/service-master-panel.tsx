"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createLeadServiceCatalogItem,
  deleteLeadServiceCatalogItem,
  setLeadServiceCatalogActive,
  updateLeadServiceCatalogItem,
} from "@/app/app/leads/actions";
import { formatInr } from "@/lib/leads/categories";

type ServiceItem = {
  id: string;
  serviceCategory: string;
  subCategory: string;
  unitPrice: number | null;
  perUserCost: number | null;
  isActive: boolean;
};

function moneyText(value: number | null) {
  return value != null && value > 0 ? formatInr(value) : "—";
}

export function ServiceMasterPanel({
  items,
  canManage,
}: {
  items: ServiceItem[];
  canManage: boolean;
}) {
  const [rows, setRows] = useState(items);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showHidden, setShowHidden] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    serviceCategory: "",
    subCategory: "",
    unitPrice: "",
    perUserCost: "",
  });
  const [createForm, setCreateForm] = useState({
    serviceCategory: "",
    subCategory: "",
    unitPrice: "",
    perUserCost: "",
  });

  const categories = useMemo(() => {
    return [...new Set(rows.map((item) => item.serviceCategory))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((item) => {
      if (!showHidden && !item.isActive) {
        return false;
      }
      if (categoryFilter !== "all" && item.serviceCategory !== categoryFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return (
        item.serviceCategory.toLowerCase().includes(needle) ||
        item.subCategory.toLowerCase().includes(needle)
      );
    });
  }, [categoryFilter, query, rows, showHidden]);

  function startEdit(item: ServiceItem) {
    setEditingId(item.id);
    setDraft({
      serviceCategory: item.serviceCategory,
      subCategory: item.subCategory,
      unitPrice: item.unitPrice != null ? String(item.unitPrice) : "",
      perUserCost: item.perUserCost != null ? String(item.perUserCost) : "",
    });
    setMessage(null);
  }

  function upsertLocal(item: ServiceItem) {
    setRows((current) => {
      const index = current.findIndex((row) => row.id === item.id);
      if (index === -1) {
        return [...current, item].sort((a, b) =>
          a.serviceCategory === b.serviceCategory
            ? a.subCategory.localeCompare(b.subCategory)
            : a.serviceCategory.localeCompare(b.serviceCategory),
        );
      }
      const next = [...current];
      next[index] = item;
      return next;
    });
  }

  function saveCreate() {
    setMessage(null);
    startTransition(async () => {
      const result = await createLeadServiceCatalogItem(createForm);
      if (!result.ok || !result.item) {
        setMessage(result.message ?? "Could not add service.");
        return;
      }
      upsertLocal({
        id: result.item.id,
        serviceCategory: result.item.serviceCategory,
        subCategory: result.item.subCategory,
        unitPrice: result.item.unitPrice,
        perUserCost: result.item.perUserCost ?? null,
        isActive: result.item.isActive ?? true,
      });
      setCreateForm({
        serviceCategory: "",
        subCategory: "",
        unitPrice: "",
        perUserCost: "",
      });
      setMessage(result.message ?? "Service added.");
    });
  }

  function saveEdit(id: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateLeadServiceCatalogItem({ id, ...draft });
      if (!result.ok || !result.item) {
        setMessage(result.message ?? "Could not update service.");
        return;
      }
      upsertLocal({
        id: result.item.id,
        serviceCategory: result.item.serviceCategory,
        subCategory: result.item.subCategory,
        unitPrice: result.item.unitPrice,
        perUserCost: result.item.perUserCost ?? null,
        isActive: result.item.isActive ?? true,
      });
      setEditingId(null);
      setMessage("Service updated.");
    });
  }

  function setActive(id: string, isActive: boolean) {
    setMessage(null);
    startTransition(async () => {
      const result = await setLeadServiceCatalogActive(id, isActive);
      if (!result.ok) {
        setMessage(result.message ?? "Could not update visibility.");
        return;
      }
      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, isActive } : row)),
      );
      setMessage(isActive ? "Service shown on quotations." : "Service hidden from quotations.");
    });
  }

  function removeItem(id: string) {
    if (!window.confirm("Remove this service from the master?")) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await deleteLeadServiceCatalogItem(id);
      if (!result.ok) {
        setMessage(result.message ?? "Could not remove service.");
        return;
      }
      if (result.message) {
        setRows((current) =>
          current.map((row) => (row.id === id ? { ...row, isActive: false } : row)),
        );
        setMessage(result.message);
        return;
      }
      setRows((current) => current.filter((row) => row.id !== id));
      if (editingId === id) {
        setEditingId(null);
      }
      setMessage("Service removed.");
    });
  }

  return (
    <div className="service-master">
      {canManage ? (
        <form
          className="service-master-form"
          onSubmit={(event) => {
            event.preventDefault();
            saveCreate();
          }}
        >
          <p className="leads-quote-new-service-title">Add a service</p>
          <div className="service-master-form-grid">
            <label>
              Category
              <input
                value={createForm.serviceCategory}
                onChange={(e) =>
                  setCreateForm((current) => ({
                    ...current,
                    serviceCategory: e.target.value,
                  }))
                }
                placeholder="e.g. EM Ready Suite"
                list="service-master-categories"
                required
              />
            </label>
            <label>
              Service name
              <input
                value={createForm.subCategory}
                onChange={(e) =>
                  setCreateForm((current) => ({
                    ...current,
                    subCategory: e.target.value,
                  }))
                }
                placeholder="e.g. EM Ready Starter (monthly)"
                required
              />
            </label>
            <label>
              Amount (₹)
              <input
                type="number"
                min="0"
                value={createForm.unitPrice}
                onChange={(e) =>
                  setCreateForm((current) => ({
                    ...current,
                    unitPrice: e.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </label>
            <label>
              Per user (₹)
              <input
                type="number"
                min="0"
                value={createForm.perUserCost}
                onChange={(e) =>
                  setCreateForm((current) => ({
                    ...current,
                    perUserCost: e.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </label>
          </div>
          <div className="service-master-form-actions">
            <button
              type="submit"
              className="btn-primary btn-sm"
              disabled={
                pending ||
                !createForm.serviceCategory.trim() ||
                !createForm.subCategory.trim()
              }
            >
              Add service
            </button>
          </div>
        </form>
      ) : null}

      <div className="service-master-toolbar">
        <label>
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Category or service name"
          />
        </label>
        <label>
          Category
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hidden
          <select
            value={showHidden ? "all" : "active"}
            onChange={(e) => setShowHidden(e.target.value === "all")}
          >
            <option value="all">Show hidden</option>
            <option value="active">Active only</option>
          </select>
        </label>
      </div>

      {message ? <p className="service-master-msg">{message}</p> : null}

      <datalist id="service-master-categories">
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      <div className="crm-submodule-table-wrap">
        <table className="crm-submodule-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Service</th>
              <th>Amount</th>
              <th>Per user</th>
              <th>Status</th>
              {canManage ? <th aria-label="Actions" /> : null}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 6 : 5}>
                  No services match this filter.
                </td>
              </tr>
            ) : (
              visible.map((item) => {
                const editing = editingId === item.id;
                return (
                  <tr
                    key={item.id}
                    className={item.isActive ? undefined : "service-master-row-inactive"}
                  >
                    <td>
                      {editing ? (
                        <input
                          className="service-master-inline-input"
                          value={draft.serviceCategory}
                          onChange={(e) =>
                            setDraft((current) => ({
                              ...current,
                              serviceCategory: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        item.serviceCategory
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <input
                          className="service-master-inline-input"
                          value={draft.subCategory}
                          onChange={(e) =>
                            setDraft((current) => ({
                              ...current,
                              subCategory: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        item.subCategory
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <input
                          className="service-master-inline-input"
                          type="number"
                          min="0"
                          value={draft.unitPrice}
                          onChange={(e) =>
                            setDraft((current) => ({
                              ...current,
                              unitPrice: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        moneyText(item.unitPrice)
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <input
                          className="service-master-inline-input"
                          type="number"
                          min="0"
                          value={draft.perUserCost}
                          onChange={(e) =>
                            setDraft((current) => ({
                              ...current,
                              perUserCost: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        moneyText(item.perUserCost)
                      )}
                    </td>
                    <td>
                      <span
                        className={`service-master-status ${
                          item.isActive ? "active" : "hidden"
                        }`}
                      >
                        {item.isActive ? "Active" : "Hidden"}
                      </span>
                    </td>
                    {canManage ? (
                      <td>
                        <div className="service-master-row-actions">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                className="btn-primary btn-sm"
                                disabled={pending}
                                onClick={() => saveEdit(item.id)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                disabled={pending}
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                disabled={pending}
                                onClick={() => startEdit(item)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                disabled={pending}
                                onClick={() => setActive(item.id, !item.isActive)}
                              >
                                {item.isActive ? "Hide" : "Show"}
                              </button>
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                disabled={pending}
                                onClick={() => removeItem(item.id)}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="crm-submodule-footnote">
        Hidden services stay in the master but do not appear on quotation line
        items. Removing a service already used on a lead hides it instead.
      </p>
    </div>
  );
}
