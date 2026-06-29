"use client";

import type { AccountsChecklistGrid } from "@/lib/checklists/accounts-grid";

function cellClass(status: AccountsChecklistGrid["rows"][0]["days"][0]["status"]) {
  switch (status) {
    case "done":
      return "ws-accounts-cell done";
    case "late":
      return "ws-accounts-cell late";
    case "overdue":
      return "ws-accounts-cell overdue";
    case "due":
      return "ws-accounts-cell due";
    default:
      return "ws-accounts-cell";
  }
}

export function AccountsChecklistGridBoard({ grid }: { grid: AccountsChecklistGrid }) {
  if (grid.rows.length === 0) {
    return (
      <div className="ws-accounts-empty">
        <p>No accounts checklist items yet.</p>
        <p className="ws-accounts-empty-hint">
          Deploy the classic accounts pack from Setup, or import your Google Sheet rows.
        </p>
      </div>
    );
  }

  return (
    <div className="ws-accounts-grid-wrap">
      <table className="ws-accounts-grid">
        <thead>
          <tr>
            <th rowSpan={2}>Accountability</th>
            <th rowSpan={2}>Freq.</th>
            <th rowSpan={2}>Last Date</th>
            <th rowSpan={2}>Particulars</th>
            <th colSpan={7}>{grid.monthLabel} - {grid.week1Label}</th>
            <th colSpan={7}>{grid.week2Label}</th>
          </tr>
          <tr>
            {Array.from({ length: 14 }, (_, index) => (
              <th key={index + 1}>{index + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.templateId}>
              <td className="ws-accounts-accountability">{row.accountability}</td>
              <td className="ws-accounts-freq">{row.freq}</td>
              <td className="ws-accounts-last-date">{row.lastDate}</td>
              <td className="ws-accounts-particular">{row.particular}</td>
              {row.days.map((cell) => (
                <td key={cell.day} className={cellClass(cell.status)}>
                  {cell.marker ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ws-accounts-legend">
        <span className="ws-accounts-cell done sample">M</span> Done on time
        <span className="ws-accounts-cell late sample">M</span> Done late
        <span className="ws-accounts-cell overdue sample">M</span> Overdue / due missed
      </p>
    </div>
  );
}
