import Link from "next/link";

export type AttendanceMonthCell = {
  userId: string;
  day: number;
  status: string;
  /** Attendance notes — used to badge OD/WFH on PRESENT days. */
  notes?: string | null;
  verifyStatus?: string | null;
  otHours?: number | null;
  isLate?: boolean;
};

export type AttendanceMonthEmployee = {
  userId: string;
  name: string;
};

export type AttendanceMonthHoliday = {
  day: number;
  name: string;
  isOptional: boolean;
};

const STATUS_SHORT: Record<string, string> = {
  PRESENT: "P",
  ABSENT: "A",
  HALF_DAY: "H",
  SHORT_LEAVE: "S",
  ON_LEAVE: "L",
  HOLIDAY: "O",
};

const STATUS_TITLE: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half day",
  SHORT_LEAVE: "Short leave",
  ON_LEAVE: "On leave",
  HOLIDAY: "Holiday",
};

function exceptionBadge(notes: string | null | undefined): "OD" | "WFH" | null {
  if (!notes) return null;
  if (notes.includes("[OD]")) return "OD";
  if (notes.includes("[WFH]")) return "WFH";
  return null;
}

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
  holidays = [],
}: {
  year: number;
  monthIndex: number;
  daysInMonth: number;
  employees: AttendanceMonthEmployee[];
  cells: AttendanceMonthCell[];
  siteId: string | null;
  holidays?: AttendanceMonthHoliday[];
}) {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const prevMonth = shiftMonth(year, monthIndex, -1);
  const nextMonth = shiftMonth(year, monthIndex, 1);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const cellMap = new Map<
    string,
    {
      status: string;
      notes: string | null;
      verifyStatus: string | null;
      otHours: number;
      isLate: boolean;
    }
  >();
  for (const cell of cells) {
    cellMap.set(`${cell.userId}:${cell.day}`, {
      status: cell.status,
      notes: cell.notes ?? null,
      verifyStatus: cell.verifyStatus ?? null,
      otHours: cell.otHours ?? 0,
      isLate: cell.isLate ?? false,
    });
  }

  const holidayByDay = new Map<number, AttendanceMonthHoliday>();
  for (const h of holidays) {
    holidayByDay.set(h.day, h);
  }

  const totals = {
    PRESENT: 0,
    ABSENT: 0,
    HALF_DAY: 0,
    SHORT_LEAVE: 0,
    ON_LEAVE: 0,
    PENDING: 0,
    OT: 0,
  };
  for (const cell of cells) {
    if (cell.verifyStatus === "PENDING") {
      totals.PENDING += 1;
    } else if (cell.status in totals) {
      totals[cell.status as keyof typeof totals] += 1;
    }
    if ((cell.otHours ?? 0) > 0) totals.OT += 1;
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
          <em className="ws-att-cell status-SHORT_LEAVE">S</em> Short leave
        </span>
        <span>
          <em className="ws-att-cell status-ON_LEAVE">L</em> Leave
        </span>
        <span>
          <em className="ws-att-cell status-HOLIDAY">O</em> Holiday
        </span>
        <span>
          <em className="ws-att-cell status-PENDING">?</em> Pending verify
        </span>
        <span>
          <em className="ws-att-cell status-OT">OT</em> Overtime (Blue)
        </span>
        <span>
          <em className="ws-att-cell status-OD">OD</em> On duty
        </span>
        <span>
          <em className="ws-att-cell status-WFH">WFH</em> Work from home
        </span>
        <span>
          <span className="ws-hr-optional-badge">Opt</span> Optional holiday
        </span>
        <span className="ws-apple-cell-secondary">
          Month totals · P {totals.PRESENT} · A {totals.ABSENT} · H{" "}
          {totals.HALF_DAY} · S {totals.SHORT_LEAVE} · L {totals.ON_LEAVE} · ?{" "}
          {totals.PENDING} · OT {totals.OT}
        </span>
      </div>

      <div className="ws-hr-table-wrap ws-attendance-month-scroll">
        <table className="ws-hr-table ws-attendance-month-table">
          <thead>
            <tr>
              <th className="ws-attendance-month-name">Employee</th>
              {days.map((day) => {
                const holiday = holidayByDay.get(day);
                return (
                  <th key={day} className="ws-attendance-month-day">
                    {day}
                    {holiday?.isOptional ? (
                      <span
                        className="ws-hr-optional-badge ws-hr-optional-badge-cal"
                        title={`Optional: ${holiday.name}`}
                      >
                        Opt
                      </span>
                    ) : null}
                  </th>
                );
              })}
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
                    const cell = cellMap.get(`${employee.userId}:${day}`);
                    if (!cell) {
                      return (
                        <td key={day} className="ws-attendance-month-day">
                          <span className="ws-att-cell is-empty">·</span>
                        </td>
                      );
                    }
                    const badge = exceptionBadge(cell.notes);
                    const isPending = cell.verifyStatus === "PENDING";
                    const hasOt = cell.otHours > 0 && !isPending;
                    const label = isPending
                      ? "?"
                      : hasOt
                        ? "OT"
                        : (badge ?? STATUS_SHORT[cell.status] ?? "?");
                    const title = isPending
                      ? "Pending manager verify"
                      : hasOt
                        ? `Overtime ${cell.otHours}h (${STATUS_TITLE[cell.status] ?? cell.status})`
                        : badge
                          ? `${badge === "OD" ? "On duty" : "Work from home"} (present)`
                          : `${STATUS_TITLE[cell.status] ?? cell.status}${cell.isLate ? " · Late" : ""}`;
                    const className = isPending
                      ? "ws-att-cell status-PENDING"
                      : hasOt
                        ? "ws-att-cell status-OT"
                        : badge
                          ? `ws-att-cell status-${badge}`
                          : `ws-att-cell status-${cell.status}`;
                    return (
                      <td key={day} className="ws-attendance-month-day">
                        <span className={className} title={title}>
                          {label}
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
