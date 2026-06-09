import { LegalFilterCountLink } from "@/components/legal/legal-filter-count-link";

type BreakdownRow = {
  label: string;
  count: number;
};

export function LegalBreakdownChart({
  title,
  total,
  rows,
  kind,
  tone,
  limit = 14,
}: {
  title: string;
  total: number;
  rows: BreakdownRow[];
  kind: "status" | "stage";
  tone: "status" | "stage";
  limit?: number;
}) {
  const visible = rows.slice(0, limit);
  const maxCount = Math.max(...visible.map((row) => row.count), 1);

  return (
    <div className={`legal-card legal-card-${tone}`}>
      <div className="legal-card-head">
        <h3>{title}</h3>
        <span className="legal-card-total">{total.toLocaleString()}</span>
      </div>
      <ul className="legal-chart-list">
        {visible.length === 0 ? (
          <li className="legal-chart-empty">No data</li>
        ) : (
          visible.map((row) => (
            <li key={row.label}>
              <LegalFilterCountLink
                caseStage={kind === "stage" ? row.label : undefined}
                count={row.count}
                fileStatus={kind === "status" ? row.label : undefined}
                maxCount={maxCount}
                rowLabel={row.label}
                variant="row"
              />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
