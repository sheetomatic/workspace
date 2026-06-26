"use client";

import Link from "next/link";
import type { FollowFatalRow } from "@/lib/legal-cases/follow-fatal";

export function FollowFatalTable({ rows }: { rows: FollowFatalRow[] }) {
  if (rows.length === 0) {
    return <p className="legal-view-empty">No follow-up entries for this month.</p>;
  }

  return (
    <div className="legal-view-table-wrap legal-follow-fatal-wrap">
      <table className="crm-data-table hs-data-table legal-table-compact legal-view-table legal-follow-fatal-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Date</th>
            <th>Field</th>
            <th>DOA</th>
            <th>FIR Date</th>
            <th>Crime No.</th>
            <th>F/I</th>
            <th>Thana</th>
            <th>Route</th>
            <th>Name of Deceased</th>
            <th>Contact</th>
            <th>Address</th>
            <th>Offending</th>
            <th>Vehicle</th>
            <th>Status</th>
            <th>Insur</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={
                row.exclusion
                  ? `legal-follow-excluded legal-follow-${row.exclusion}`
                  : "legal-follow-active"
              }
            >
              <td>{row.sno}</td>
              <td>{row.followDate}</td>
              <td>{row.field || "-"}</td>
              <td>{row.doa || "-"}</td>
              <td>{row.firDate || "-"}</td>
              <td>{row.crimeNo || "-"}</td>
              <td>{row.fi || "-"}</td>
              <td>{row.thana || "-"}</td>
              <td>{row.route || "-"}</td>
              <td>
                <Link href={`/app/cases/${row.id}`}>{row.deceased || "-"}</Link>
              </td>
              <td>{row.contact || "-"}</td>
              <td title={row.address}>{row.address || "-"}</td>
              <td>{row.offending || "-"}</td>
              <td>{row.vehicle || "-"}</td>
              <td>{row.status || "-"}</td>
              <td>{row.insur || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="legal-follow-legend">
        <span className="legal-follow-active-sample">Active follow-up</span>
        <span className="legal-follow-no-insurance-sample">No insurance — stop following</span>
        <span className="legal-follow-unknown-sample">Unknown vehicle — low value</span>
        <span className="legal-follow-lost-sample">Lost — may re-contact later</span>
      </p>
    </div>
  );
}

export function FollowFatalFilters({
  month,
  hideExcluded,
}: {
  month: string;
  hideExcluded: boolean;
}) {
  return (
    <form className="legal-follow-filters no-print" method="get">
      <label>
        Month (DOA)
        <input type="month" name="month" defaultValue={month} />
      </label>
      <label className="ws-hr-checkbox">
        <input
          defaultChecked={hideExcluded}
          name="hideExcluded"
          type="checkbox"
          value="1"
        />
        Hide excluded (no insurance / unknown vehicle / lost)
      </label>
      <button className="btn-cta btn-secondary" type="submit">
        Apply
      </button>
    </form>
  );
}
