"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  createHolidayAction,
  deleteHolidayAction,
  importDefaultHolidaysAction,
  updateHolidayAction,
} from "@/lib/hr/hr-actions";
import {
  HOLIDAY_REGIONS,
  MAX_HOLIDAYS_PER_YEAR,
} from "@/lib/hr/holiday-catalog";

export type HolidayRow = {
  id: string;
  date: Date | string;
  name: string;
  isOptional: boolean;
};

function formatDate(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function HolidayAdminPanel({
  year,
  holidays,
}: {
  year: number;
  holidays: HolidayRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [rows, setRows] = useState<HolidayRow[]>(holidays);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setRows(holidays);
  }, [holidays]);

  function onCreate(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await createHolidayAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Holiday saved.");
      router.refresh();
    });
  }

  function onImportDefaults(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await importDefaultHolidaysAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Standard holiday calendar imported for this year.");
      router.refresh();
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const fd = new FormData();
      fd.set("id", id);
      const result = await deleteHolidayAction(fd);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Holiday removed.");
      router.refresh();
    });
  }

  function onToggleOptional(id: string, next: boolean) {
    const previous = rows;
    setMessage(null);
    setIsError(false);
    setTogglingId(id);
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, isOptional: next } : row,
      ),
    );

    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("isOptional", next ? "true" : "false");
      const result = await updateHolidayAction(fd);
      if (!result.ok) {
        setRows(previous);
        setMessage(result.message);
        setIsError(true);
        setTogglingId(null);
        return;
      }
      setMessage(next ? "Marked optional." : "Marked mandatory.");
      setTogglingId(null);
    });
  }

  return (
    <>
      <div className="ws-attendance-month-nav" aria-label="Year navigation">
        <Link
          className="btn-cta btn-secondary btn-compact"
          href={`/app/hr/holidays?year=${year - 1}`}
        >
          {year - 1}
        </Link>
        <span className="ws-attendance-month-label">{year}</span>
        <Link
          className="btn-cta btn-secondary btn-compact"
          href={`/app/hr/holidays?year=${year + 1}`}
        >
          {year + 1}
        </Link>
      </div>

      <div className="ws-hr-split">
        <section className="ws-hr-panel">
          <h2>Import standard calendar</h2>
          <p className="ws-hr-help">
            Add {MAX_HOLIDAYS_PER_YEAR} holidays for {year}: core national
            holidays plus region-wise optional days that can be toggled later.
          </p>
          <form action={onImportDefaults} className="ws-hr-form">
            <input type="hidden" name="year" value={year} />
            <label>
              Region preset
              <select name="region" defaultValue="national">
                {HOLIDAY_REGIONS.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="btn-cta btn-secondary"
              disabled={pending}
            >
              {pending ? "Importing…" : `Import ${MAX_HOLIDAYS_PER_YEAR} defaults`}
            </button>
          </form>
          <div className="ws-hr-holiday-region-list">
            {HOLIDAY_REGIONS.map((region) => (
              <p key={region.id} className="ws-hr-help">
                <strong>{region.label}:</strong> {region.description}
              </p>
            ))}
          </div>
        </section>

        <section className="ws-hr-panel">
          <h2>Add holiday manually</h2>
          <p className="ws-hr-help">
            {rows.length}/{MAX_HOLIDAYS_PER_YEAR} holidays configured for{" "}
            {year}. Manual additions are capped at {MAX_HOLIDAYS_PER_YEAR} per
            year.
          </p>
          <form action={onCreate} className="ws-hr-form">
            <label>
              Name
              <input
                name="name"
                type="text"
                required
                placeholder="e.g. Republic Day"
              />
            </label>
            <label>
              Date
              <input name="date" type="date" required />
            </label>
            <label className="ws-hr-checkbox">
              <input name="isOptional" type="checkbox" />
              <span>Optional (does not auto-mark attendance)</span>
            </label>
            <button
              type="submit"
              className="btn-cta btn-primary"
              disabled={pending}
            >
              {pending ? "Saving…" : "Add holiday"}
            </button>
          </form>
        </section>
      </div>

      <div className="ws-hr-split">
        <section className="ws-hr-panel">
          <h2>Holidays in {year}</h2>
          <p className="ws-hr-help">
            Toggle optional anytime. Optional holidays stay on the calendar but
            do not auto-mark attendance as Holiday.
          </p>
          <div className="ws-hr-table-wrap">
            <table className="ws-hr-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Optional</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No holidays for this year yet.</td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const rowBusy = togglingId === row.id;
                    return (
                      <tr key={row.id}>
                        <td>{formatDate(row.date)}</td>
                        <td>
                          {row.name}{" "}
                          {row.isOptional ? (
                            <span className="ws-hr-optional-badge">Optional</span>
                          ) : null}
                        </td>
                        <td>{row.isOptional ? "Optional" : "Mandatory"}</td>
                        <td>
                          <label className="ws-hr-checkbox">
                            <input
                              type="checkbox"
                              checked={row.isOptional}
                              disabled={rowBusy}
                              onChange={(e) =>
                                onToggleOptional(row.id, e.target.checked)
                              }
                              aria-label={`Mark ${row.name} as optional`}
                            />
                            <span className="ws-apple-cell-secondary">
                              {rowBusy
                                ? "Saving…"
                                : row.isOptional
                                  ? "On"
                                  : "Off"}
                            </span>
                          </label>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            disabled={pending || rowBusy}
                            onClick={() => onDelete(row.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {message ? (
        <p
          className={isError ? "ws-hr-feedback-error" : "ws-hr-feedback"}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </>
  );
}
