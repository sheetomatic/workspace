import Link from "next/link";
import type { AssigneeCountRow } from "@/lib/legal-cases/queries";
import { LEGAL_CASES_LIST_PATH } from "@/lib/legal-cases/list-filters";

export function LegalAssigneeList({
  rows,
  total,
}: {
  rows: AssigneeCountRow[];
  total: number;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="legal-card legal-card-assignees">
      <div className="legal-card-head">
        <h3>Assignees</h3>
        <Link className="legal-panel-link" href={LEGAL_CASES_LIST_PATH}>
          {total.toLocaleString()} assigned
        </Link>
      </div>
      <nav aria-label="Assignees" className="legal-list-assignee-nav">
        <Link
          className="legal-list-assignee-chip"
          href={LEGAL_CASES_LIST_PATH}
          title="Browse all assignees"
        >
          <span className="legal-list-assignee-chip-code">All</span>
          <span className="legal-list-assignee-chip-label">assignees</span>
          <span className="legal-list-assignee-chip-count">{total.toLocaleString()}</span>
        </Link>
        {rows.map((row) => {
          const href = `${LEGAL_CASES_LIST_PATH}?assignee=${encodeURIComponent(row.code)}`;
          const disabled = row.caseCount <= 0;

          if (disabled) {
            return (
              <span
                key={row.code}
                className="legal-list-assignee-chip is-disabled"
                title={`No cases for ${row.code}`}
              >
                <span className="legal-list-assignee-chip-code">{row.code}</span>
                <span className="legal-list-assignee-chip-count">0</span>
              </span>
            );
          }

          return (
            <Link
              key={row.code}
              className="legal-list-assignee-chip"
              href={href}
              title={`Open cases for ${row.code}`}
            >
              <span className="legal-list-assignee-chip-code">{row.code}</span>
              <span className="legal-list-assignee-chip-count">
                {row.caseCount.toLocaleString()}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
