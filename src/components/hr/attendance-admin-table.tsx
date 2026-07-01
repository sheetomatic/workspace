"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import {
  deleteAttendanceRecordAction,
  updateAttendanceRecordAction,
} from "@/lib/hr/hr-actions";

export type AttendanceTableRow = {
  id: string;
  employeeName: string;
  siteName: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  method: string;
  geoFenceOk: boolean | null;
  notes: string | null;
};

function formatTime(iso: string | null) {
  if (!iso) {
    return "-";
  }
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function geoLabel(geoFenceOk: boolean | null) {
  if (geoFenceOk == null) {
    return "-";
  }
  return geoFenceOk ? "OK" : "Outside";
}

export function AttendanceAdminTable({
  records,
  canManage,
}: {
  records: AttendanceTableRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const colSpan = canManage ? 7 : 6;

  function runDelete(record: AttendanceTableRow) {
    const label = record.employeeName;
    if (!window.confirm(`Delete attendance for ${label}?`)) {
      return;
    }
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      try {
        await deleteAttendanceRecordAction(record.id);
        if (editingId === record.id) {
          setEditingId(null);
        }
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not delete row.",
        );
        setIsError(true);
      }
    });
  }

  return (
    <section className="ws-hr-panel">
      <h2>Today&apos;s attendance</h2>
      {canManage ? (
        <p className="ws-hr-help">Super admin: edit or delete any punch row.</p>
      ) : null}
      <div className="ws-hr-table-wrap">
        <table className="ws-hr-table ws-attendance-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Site</th>
              <th>Check in</th>
              <th>Check out</th>
              <th>Method</th>
              <th>Geo</th>
              {canManage ? <th className="ws-attendance-col-actions">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>No punches recorded today.</td>
              </tr>
            ) : (
              records.map((row) => (
                <Fragment key={row.id}>
                  <tr>
                    <td>{row.employeeName}</td>
                    <td>{row.siteName}</td>
                    <td>{formatTime(row.checkInAt)}</td>
                    <td>{formatTime(row.checkOutAt)}</td>
                    <td>{row.method}</td>
                    <td>{geoLabel(row.geoFenceOk)}</td>
                    {canManage ? (
                      <td className="ws-attendance-row-actions">
                        <button
                          type="button"
                          className="ws-attendance-icon-btn"
                          title="Edit attendance"
                          aria-label={`Edit ${row.employeeName}`}
                          disabled={pending}
                          onClick={() => {
                            setEditingId((current) =>
                              current === row.id ? null : row.id,
                            );
                            setMessage(null);
                            setIsError(false);
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="ws-attendance-icon-btn danger"
                          title="Delete attendance"
                          aria-label={`Delete ${row.employeeName}`}
                          disabled={pending}
                          onClick={() => runDelete(row)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                  {canManage && editingId === row.id ? (
                    <tr key={`${row.id}-edit`} className="ws-attendance-edit-row">
                      <td colSpan={colSpan}>
                        <form
                          className="ws-attendance-edit-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const formData = new FormData(event.currentTarget);
                            startTransition(async () => {
                              setMessage(null);
                              setIsError(false);
                              try {
                                await updateAttendanceRecordAction(formData);
                                setEditingId(null);
                                router.refresh();
                              } catch (error) {
                                setMessage(
                                  error instanceof Error
                                    ? error.message
                                    : "Could not save changes.",
                                );
                                setIsError(true);
                              }
                            });
                          }}
                        >
                          <input name="id" type="hidden" value={row.id} />
                          <div className="ws-attendance-edit-grid">
                            <label>
                              Check in
                              <input
                                defaultValue={toDatetimeLocalValue(row.checkInAt)}
                                name="checkInAt"
                                type="datetime-local"
                              />
                            </label>
                            <label>
                              Check out
                              <input
                                defaultValue={toDatetimeLocalValue(row.checkOutAt)}
                                name="checkOutAt"
                                type="datetime-local"
                              />
                            </label>
                            <label>
                              Method
                              <select defaultValue={row.method} name="method">
                                <option value="WEB">WEB</option>
                                <option value="GEO">GEO</option>
                                <option value="FACE">FACE</option>
                              </select>
                            </label>
                            <label>
                              Geo status
                              <select
                                defaultValue={
                                  row.geoFenceOk == null
                                    ? "null"
                                    : row.geoFenceOk
                                      ? "true"
                                      : "false"
                                }
                                name="geoFenceOk"
                              >
                                <option value="null">Not set</option>
                                <option value="true">OK</option>
                                <option value="false">Outside</option>
                              </select>
                            </label>
                            <label className="ws-attendance-edit-notes">
                              Notes
                              <input
                                defaultValue={row.notes ?? ""}
                                name="notes"
                                placeholder="Optional admin note"
                                type="text"
                              />
                            </label>
                          </div>
                          <div className="ws-attendance-edit-actions">
                            <button
                              className="btn-primary btn-sm"
                              disabled={pending}
                              type="submit"
                            >
                              {pending ? "Saving..." : "Save"}
                            </button>
                            <button
                              className="btn-secondary btn-sm"
                              disabled={pending}
                              type="button"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      {message ? (
        <p className={isError ? "ws-hr-feedback ws-hr-feedback-error" : "ws-hr-feedback"}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
