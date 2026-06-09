import Link from "next/link";
import type { LegalSectionNumber } from "@/lib/legal-cases/constants";
import { LEGAL_CASES_LIST_PATH } from "@/lib/legal-cases/list-filters";

type SectionRow = {
  section: LegalSectionNumber;
  label: string;
  count: number;
};

export function LegalSectionStrip({
  rows,
}: {
  rows: SectionRow[];
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="legal-card legal-card-sections">
      <div className="legal-card-head">
        <h3>Sections</h3>
        <Link className="legal-panel-link" href={LEGAL_CASES_LIST_PATH}>
          {total.toLocaleString()} assigned
        </Link>
      </div>
      <div className="legal-section-grid">
        <Link
          className="legal-section-tile legal-section-tile-link"
          href={LEGAL_CASES_LIST_PATH}
          title="Browse all sections"
        >
          <span className="legal-section-tile-code">All</span>
          <span className="legal-section-tile-label">sections</span>
          <span className="legal-section-tile-count">{total.toLocaleString()}</span>
        </Link>
        {rows.map((row) => {
          const href = `${LEGAL_CASES_LIST_PATH}?section=${row.section}`;
          const disabled = row.count <= 0;

          if (disabled) {
            return (
              <span
                key={row.section}
                className="legal-section-tile is-disabled"
                title={`No cases in S${row.section}`}
              >
                <span className="legal-section-tile-code">S{row.section}</span>
                <span className="legal-section-tile-label" title={row.label}>
                  {row.label}
                </span>
                <span className="legal-section-tile-count">0</span>
              </span>
            );
          }

          return (
            <Link
              key={row.section}
              className="legal-section-tile legal-section-tile-link"
              href={href}
              title={`Open S${row.section} - ${row.label}`}
            >
              <span className="legal-section-tile-code">S{row.section}</span>
              <span className="legal-section-tile-label" title={row.label}>
                {row.label}
              </span>
              <span className="legal-section-tile-count">
                {row.count.toLocaleString()}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
