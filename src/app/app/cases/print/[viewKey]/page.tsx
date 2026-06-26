import { LegalPrintListToolbar } from "@/components/legal/legal-print-list-toolbar";
import {
  buildViewPrintList,
} from "@/lib/legal-cases/print-list";
import type { LegalViewKey } from "@/lib/legal-cases/views";
import { requireSession } from "@/lib/require-session";
import { notFound } from "next/navigation";
import "@/components/legal/legal-cases.css";

type PageProps = {
  params: Promise<{ viewKey: string }>;
  searchParams: Promise<{ asOf?: string }>;
};

const ALLOWED: LegalViewKey[] = ["diary", "statement"];

function parseAsOf(value: string | undefined): Date {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

export default async function LegalViewPrintPage({ params, searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "CASES" });
  const { viewKey: rawKey } = await params;
  if (!ALLOWED.includes(rawKey as LegalViewKey)) {
    notFound();
  }
  const viewKey = rawKey as "diary" | "statement";
  const resolved = await searchParams;
  const asOfDate = parseAsOf(resolved.asOf);

  const result = await buildViewPrintList(user, viewKey, { asOf: asOfDate });

  return (
    <div className="saas-page legal-print-page">
      <LegalPrintListToolbar
        asOfValue={asOfDate.toISOString().slice(0, 10)}
        backHref={`/app/cases/views/${viewKey}`}
        backLabel={`Back to ${viewKey === "diary" ? "Diary" : "Statement"}`}
        showSort={false}
        sortValue="field"
      />

      <div className="legal-print-doc">
        <h1 className="legal-print-title">
          {result.title} — AS ON {result.asOfLabel}
        </h1>
        <p className="legal-print-sub">
          {result.total.toLocaleString()} cases · red-pen workflow: mark no-show (B/C/D/E) and
          publication due (D/E+) on case detail
        </p>

        {result.rows.length === 0 ? (
          <p className="legal-view-empty">No cases in this diary.</p>
        ) : (
          <table className="legal-print-table legal-diary-print-table">
            <thead>
              <tr>
                {result.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr
                  key={row.id}
                  className={
                    row.highlight === "publication"
                      ? "lp-diary-publication"
                      : row.highlight === "no-show"
                        ? "lp-diary-no-show"
                        : undefined
                  }
                >
                  {row.cells.map((cell, index) => (
                    <td key={`${row.id}-${index}`}>{cell || ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
