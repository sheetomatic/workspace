"use client";

import type { ReactNode } from "react";
import { formatInr } from "@/lib/leads/categories";
import { formatInrInWords } from "@/lib/inr-words";
import type { SalarySlipData } from "@/lib/hr/salary-slip";

function fmtDate(ymd: string) {
  const date = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SalarySlipView({
  slip,
  toolbar,
}: {
  slip: SalarySlipData;
  toolbar?: ReactNode;
}) {
  const orgLogoUrl = slip.organization.logoUrl?.trim() || null;
  const employeeName = slip.employee.name || slip.employee.email;
  const periodLabel =
    slip.period.label ||
    `${fmtDate(slip.period.start)} – ${fmtDate(slip.period.end)}`;

  return (
    <div className="salary-slip-page">
      {toolbar}
      <article className="salary-slip-sheet">
        <header className="salary-slip-header">
          <div className="salary-slip-brand">
            {orgLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgLogoUrl}
                alt={slip.organization.name}
                className="salary-slip-logo"
              />
            ) : null}
            <div>
              <strong className="salary-slip-org-name">
                {slip.organization.name}
              </strong>
              <p className="salary-slip-org-sub">Salary slip</p>
            </div>
          </div>
          <div className="salary-slip-meta">
            <h2>Payslip</h2>
            <p>
              <strong>{periodLabel}</strong>
            </p>
            <p>
              {fmtDate(slip.period.start)} – {fmtDate(slip.period.end)}
            </p>
          </div>
        </header>

        <section className="salary-slip-employee">
          <div>
            <h3>Employee</h3>
            <p>
              <strong>{employeeName}</strong>
            </p>
            <p>{slip.employee.email}</p>
            {slip.employee.employeeCode ? (
              <p>Code: {slip.employee.employeeCode}</p>
            ) : null}
            {slip.employee.designation ? (
              <p>Designation: {slip.employee.designation}</p>
            ) : null}
            {slip.employee.department ? (
              <p>Department: {slip.employee.department}</p>
            ) : null}
            {slip.employee.panMasked ? (
              <p>PAN: {slip.employee.panMasked}</p>
            ) : null}
          </div>
          <div>
            <h3>Bank & statutory</h3>
            <p>Bank: {slip.employee.bankName ?? "—"}</p>
            <p>A/c: {slip.employee.bankAccountMasked ?? "—"}</p>
            <p>IFSC: {slip.employee.ifsc ?? "—"}</p>
            <p>UAN: {slip.employee.uan ?? "—"}</p>
            <p>PF: {slip.employee.pfNumber ?? "—"}</p>
            <p>ESI: {slip.employee.esiNumber ?? "—"}</p>
          </div>
          <div>
            <h3>Attendance</h3>
            <p>
              Payable {slip.attendance.payableDays} / {slip.attendance.workingDays}{" "}
              working days
            </p>
            <p>Present: {slip.attendance.presentDays}</p>
            <p>Leave: {slip.attendance.leaveDays}</p>
            <p>Absent: {slip.attendance.absentDays}</p>
            <p>Half day: {slip.attendance.halfDays}</p>
          </div>
        </section>

        <div className="salary-slip-tables">
          <table className="salary-slip-table">
            <thead>
              <tr>
                <th>Earnings</th>
                <th className="num">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {slip.earnings.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td className="num">{formatInr(row.amount)}</td>
                </tr>
              ))}
              <tr className="salary-slip-subtotal">
                <td>Total earnings</td>
                <td className="num">
                  <strong>{formatInr(slip.totals.grossEarnings)}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="salary-slip-table">
            <thead>
              <tr>
                <th>Deductions</th>
                <th className="num">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {slip.deductions.length === 0 ? (
                <tr>
                  <td colSpan={2}>No deductions</td>
                </tr>
              ) : (
                slip.deductions.map((row) => (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    <td className="num">{formatInr(row.amount)}</td>
                  </tr>
                ))
              )}
              <tr className="salary-slip-subtotal">
                <td>Total deductions</td>
                <td className="num">
                  <strong>{formatInr(slip.totals.totalDeductions)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="salary-slip-net">
          <div>
            <span>Monthly CTC</span>
            <strong>{formatInr(slip.monthlySalary)}</strong>
          </div>
          <div>
            <span>Gross earnings</span>
            <strong>{formatInr(slip.totals.grossEarnings)}</strong>
          </div>
          <div className="salary-slip-net-pay">
            <span>Net pay</span>
            <strong>{formatInr(slip.totals.netPay)}</strong>
          </div>
        </section>

        <p className="salary-slip-words">
          Net pay in words: <em>{formatInrInWords(slip.totals.netPay)}</em>
        </p>

        {slip.notes ? (
          <p className="salary-slip-notes">Notes: {slip.notes}</p>
        ) : null}

        {slip.assumptions.length > 0 ? (
          <ul className="salary-slip-assumptions">
            {slip.assumptions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}

        <footer className="salary-slip-footer">
          This is a computer-generated salary slip for {slip.organization.name}.
          For queries contact your HR / accounts team.
        </footer>
      </article>

      <style>{`
        .salary-slip-standalone {
          min-height: 100vh;
          background: #f8fafc;
        }
        .salary-slip-page {
          min-height: 100vh;
          background: #f8fafc;
          padding: 1rem;
        }
        .salary-slip-toolbar {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
        }
        .salary-slip-sheet {
          max-width: 900px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 2rem;
          color: #0f172a;
        }
        .salary-slip-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 1rem;
          margin-bottom: 1.25rem;
        }
        .salary-slip-brand {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          min-width: 0;
          flex: 1 1 auto;
        }
        .salary-slip-logo {
          display: block;
          height: 44px;
          width: auto;
          max-width: min(220px, 100%);
          object-fit: contain;
          object-position: left center;
        }
        .salary-slip-org-name {
          display: block;
          font-size: 1.05rem;
        }
        .salary-slip-org-sub {
          margin: 0.15rem 0 0;
          font-size: 0.8rem;
          color: #64748b;
        }
        .salary-slip-meta {
          text-align: right;
          flex: 0 0 auto;
        }
        .salary-slip-meta h2 {
          margin: 0 0 0.35rem;
          font-size: 1.15rem;
        }
        .salary-slip-meta p {
          margin: 0.15rem 0;
          font-size: 0.88rem;
          color: #334155;
        }
        .salary-slip-employee {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1.25rem;
          font-size: 0.88rem;
          line-height: 1.55;
        }
        .salary-slip-employee h3 {
          margin: 0 0 0.4rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
        }
        .salary-slip-employee p {
          margin: 0.1rem 0;
        }
        .salary-slip-tables {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .salary-slip-table {
          width: 100%;
          border-collapse: collapse;
        }
        .salary-slip-table th,
        .salary-slip-table td {
          border: 1px solid #cbd5e1;
          padding: 0.45rem 0.6rem;
          font-size: 0.88rem;
        }
        .salary-slip-table th {
          background: #0f766e;
          color: #fff;
          text-align: left;
        }
        .salary-slip-table .num {
          text-align: right;
          white-space: nowrap;
        }
        .salary-slip-subtotal td {
          background: #f8fafc;
        }
        .salary-slip-net {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
          margin: 1rem 0;
        }
        .salary-slip-net > div {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.65rem 0.75rem;
        }
        .salary-slip-net span {
          display: block;
          font-size: 0.72rem;
          color: #64748b;
          margin-bottom: 0.2rem;
        }
        .salary-slip-net strong {
          font-size: 1rem;
        }
        .salary-slip-net-pay {
          background: #ecfdf5;
          border-color: #6ee7b7 !important;
        }
        .salary-slip-words {
          font-size: 0.86rem;
          color: #334155;
          margin: 0.5rem 0 1rem;
        }
        .salary-slip-words em {
          font-style: normal;
          font-weight: 600;
        }
        .salary-slip-notes {
          font-size: 0.82rem;
          color: #64748b;
          margin: 0 0 0.75rem;
        }
        .salary-slip-assumptions {
          margin: 0 0 1rem;
          padding-left: 1.1rem;
          font-size: 0.75rem;
          color: #64748b;
          line-height: 1.45;
        }
        .salary-slip-footer {
          margin-top: 1.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e2e8f0;
          font-size: 0.78rem;
          color: #64748b;
        }
        @media (max-width: 720px) {
          .salary-slip-employee,
          .salary-slip-tables,
          .salary-slip-net {
            grid-template-columns: 1fr;
          }
          .salary-slip-header {
            flex-direction: column;
          }
          .salary-slip-meta {
            text-align: left;
          }
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
          .salary-slip-standalone,
          .salary-slip-page {
            background: #fff !important;
            padding: 0 !important;
            min-height: auto;
          }
          .salary-slip-sheet {
            border: none;
            border-radius: 0;
            max-width: none;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
