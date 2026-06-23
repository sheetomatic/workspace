import Link from "next/link";
import type { LegalCase } from "@prisma/client";
import type { LegalViewColumn } from "@/lib/legal-cases/views";

export function LegalCaseViewTable({
  columns,
  items,
}: {
  columns: LegalViewColumn[];
  items: LegalCase[];
}) {
  if (columns.length === 0) {
    return (
      <p className="legal-view-empty">
        This view is missing table columns. Contact support.
      </p>
    );
  }

  if (items.length === 0) {
    return <p className="legal-view-empty">No cases match this view.</p>;
  }

  return (
    <div className="legal-view-table-wrap">
      <table className="crm-data-table hs-data-table legal-table-compact legal-view-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((legalCase, rowIndex) => (
            <tr key={legalCase.id}>
              {columns.map((column) => {
                const value = column.getValue(legalCase, rowIndex);
                const isFile = column.label.toLowerCase().includes("file no");
                return (
                  <td key={column.key} className={column.className} title={value}>
                    {isFile ? (
                      <Link href={`/app/cases/${legalCase.id}`}>{value || "-"}</Link>
                    ) : (
                      value || "-"
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
