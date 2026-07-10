import Link from "next/link";

export type AttendanceMonthCell = {
  userId: string;
  day: number;
  status: string;
};

export type AttendanceMonthEmployee = {
  userId: string;
  name: string;
};

const STATUS_SHORT: Record<string, string> = {
  PRESENT: "P",
  ABSENT: "A",
  HALF_DAY: "H",
  ON_LEAVE: "L",
  HOLIDAY: "O",
};

const STATUS_TITLE: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half day",
  ON_LEAVE: "On leave",
  HOLIDAY: "Holiday",
};

function monthLabel(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shiftMonth(year: number, monthIndex: number, delta: number) {
  const date = new Date(Date.UTC(year, monthIndex + delta, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function buildHref(month: string, siteId: string | null) {
  const params = new URLSearchParams({ month });
  if (siteId) {
    params.set("site", siteId);
  }
  return `/app/hr/attendance?${params.toString()}`;
}

export function AttendanceMonthCalendar({
  year,
  monthIndex,
  daysInMonth,
  employees,
  cells,
  siteId,
}: {
  year: number;
  monthIndex: number;
  daysInMonth: number;
  employees: AttendanceMonthEmployee[];
  cells: AttendanceMonthCell[];
  siteId: string | null;
}) {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const prevMonth = shiftMonth(year, monthIndex, -1);
  const nextMonth = shiftMonth(year, monthIndex, 1);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const cellMap = new Map<string, string>();
  for (const cell of cells) {
    cellMap.set(`${cell.userId}:${cell.day}`, cell.status);
  }

  const totals = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, ON_LEAVE: 0 };
  for (const cell of cells) {
    if (cell.status in totals) {
      totals[cell.status as keyof typeof totals] += 1;
    }
  }

  return (
    <section className="ws-hr-panel ws-attendance-month-panel">
      <div className="ws-attendance-month-head">
        <h2>Monthly attendance</h2>
        <div className="ws-attendance-month-nav" aria-label="Month navigation">
          <Link
            className="btn-cta btn-secondary btn-compact"
            href={buildHref(prevMonth, siteId)}
          >
            Previous
          </Link>
          <span className="ws-attendance-month-label">{monthLabel(year, monthIndex)}</span>
          <Link
            className="btn-cta btn-secondary btn-compact"
            href={buildHref(nextMonth, siteId)}
          >
            Next
          </Link>
          {monthKey !== new Date().toISOString().slice(0, 7) ? (
            <Link
              className="btn-cta btn-secondary btn-compact"
              href={buildHref(new Date().toISOString().slice(0, 7), siteId)}
            >
              This month
            </Link>
          ) : null}
        </div>
      </div>

      <div className="ws-attendance-month-legend" aria-label="Status legend">
        <span>
          <em className="ws-att-cell status-PRESENT">P</em> Present
        </span>
        <span>
          <em className="ws-att-cell status-ABSENT">A</em> Absent
        </span>
        <span>
          <em className="ws-att-cell status-HALF_DAY">H</em> Half day
        </span>
        <span>
          <em className="ws-att-cell status-ON_LEAVE">L</em> Leave
        </span>
        <span>
          <em className="ws-att-cell status-HOLIDAY">O</em> Holiday
        </span>
        <span className="ws-apple-cell-secondary">
          Month totals · P {totals.PRESENT} · A {totals.ABSENT} · H{" "}
          {totals.HALF_DAY} · L {totals.ON_LEAVE}
        </span>
      </div>

      <div className="ws-hr-table-wrap ws-attendance-month-scroll">
        <table className="ws-hr-table ws-attendance-month-table">
          <thead>
            <tr>
              <th className="ws-attendance-month-name">Employee</th>
              {days.map((day) => (
                <th key={day} className="ws-attendance-month-day">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={daysInMonth + 1}>No employees in this workspace.</td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr key={employee.userId}>
                  <td className="ws-attendance-month-name">{employee.name}</td>
                  {days.map((day) => {
                    const status = cellMap.get(`${employee.userId}:${day}`);
                    if (!status) {
                      return (
                        <td key={day} className="ws-attendance-month-day">
                          <span className="ws-att-cell is-empty">·</span>
                        </td>
                      );
                    }
                    return (
                      <td key={day} className="ws-attendance-month-day">
                        <span
                          className={`ws-att-cell status-${status}`}
                          title={STATUS_TITLE[status] ?? status}
                        >
                          {STATUS_SHORT[status] ?? "?"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
