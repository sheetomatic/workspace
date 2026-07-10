"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createHolidayAction,
  deleteHolidayAction,
} from "@/lib/hr/hr-actions";

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
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

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
          <h2>Add holiday</h2>
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

        <section className="ws-hr-panel">
          <h2>Holidays in {year}</h2>
          <div className="ws-hr-table-wrap">
            <table className="ws-hr-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No holidays for this year yet.</td>
                  </tr>
                ) : (
                  holidays.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.name}</td>
                      <td>{row.isOptional ? "Optional" : "Mandatory"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          disabled={pending}
                          onClick={() => onDelete(row.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
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
