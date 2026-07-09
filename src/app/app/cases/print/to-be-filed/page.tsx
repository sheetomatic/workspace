import { LegalPrintListToolbar } from "@/components/legal/legal-print-list-toolbar";
import {
  buildToBeFiledPrintList,
  type PrintListSortKey,
} from "@/lib/legal-cases/print-list";
import { requireLegalCasesSession } from "@/lib/require-session";
import "@/components/legal/legal-cases.css";

type PageProps = {
  searchParams: Promise<{ sort?: string; asOf?: string }>;
};

const SORT_KEYS: PrintListSortKey[] = ["field", "file", "doa"];

function parseSort(value: string | undefined): PrintListSortKey {
  return SORT_KEYS.includes(value as PrintListSortKey)
    ? (value as PrintListSortKey)
    : "field";
}

function parseAsOf(value: string | undefined): Date {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function CasesToBeFiledPrintPage({ searchParams }: PageProps) {
  const user = await requireLegalCasesSession();
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const asOfDate = parseAsOf(params.asOf);

  const result = await buildToBeFiledPrintList(user, { sort, asOf: asOfDate });

  return (
    <div className="saas-page legal-print-page">
      <LegalPrintListToolbar
        asOfValue={toDateInputValue(asOfDate)}
        sortValue={sort}
      />

      <div className="legal-print-doc">
        <h1 className="legal-print-title">
          CASES TO BE FILED AS ON {result.asOfLabel} (HINGORANI CHAMBER)
        </h1>
        <p className="legal-print-sub">
          {result.total.toLocaleString()} case
          {result.total === 1 ? "" : "s"} · sorted by{" "}
          {sort === "file"
            ? "File No."
            : sort === "doa"
              ? "Date of accident"
              : "Field handler"}
        </p>

        {result.sections.length === 0 ? (
          <p className="legal-view-empty">No cases in the filing pipeline.</p>
        ) : (
          result.sections.map((section) => (
            <section className="legal-print-section" key={section.key}>
              <h2 className={`legal-print-section-head lp-head-${section.key}`}>
                {section.title} ({section.rows.length})
              </h2>
              <table className="legal-print-table">
                <thead>
                  <tr>
                    {result.columns.map((column) => (
                      <th key={column.key} className={column.className}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.id} className={`lp-status-${row.statusKey}`}>
                      {result.columns.map((column) => (
                        <td key={column.key} className={column.className}>
                          {row.cells[column.key] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
