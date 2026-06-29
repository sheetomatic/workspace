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
  return (
    <section className="ws-sf-list-view ws-accounts-grid-section" aria-label="Accounts grid">
      <header className="ws-sf-list-view-header">
        <div className="ws-sf-list-view-title">
          <h2>{grid.monthLabel}</h2>
          <span className="ws-sf-list-view-count">{grid.rows.length}</span>
        </div>
        <p className="ws-em-section-lead">
          Classic accountability sheet with {grid.week1Label} and {grid.week2Label} tracking.
        </p>
      </header>

      {grid.rows.length === 0 ? (
        <div className="ws-empty-state ws-fms-empty-state">
          <p>No accounts checklist items yet.</p>
          <p className="ws-fms-muted">
            Deploy the classic accounts pack above, or import rows from Setup.
          </p>
        </div>
      ) : (
        <>
          <div className="ws-sf-table-wrap ws-accounts-grid-wrap">
            <table className="ws-accounts-grid ws-fms-data-table">
              <thead>
                <tr>
                  <th rowSpan={2}>Accountability</th>
                  <th rowSpan={2}>Freq.</th>
                  <th rowSpan={2}>Last Date</th>
                  <th rowSpan={2}>Particulars</th>
                  <th colSpan={7}>
                    {grid.monthLabel} - {grid.week1Label}
                  </th>
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
          </div>
          <p className="ws-accounts-legend">
            <span className="ws-accounts-cell done sample">M</span> Done on time
            <span className="ws-accounts-cell late sample">M</span> Done late
            <span className="ws-accounts-cell overdue sample">M</span> Overdue / due missed
          </p>
        </>
      )}
    </section>
  );
}
