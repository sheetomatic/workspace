import Link from "next/link";
import type { LegalCase } from "@prisma/client";
import type { LegalViewColumn } from "@/lib/legal-cases/views";
import { needsPublicationAlert } from "@/lib/legal-cases/intake-fields";

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
            <th className="legal-table-action-col">Edit</th>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((legalCase, rowIndex) => {
            const rowClass = needsPublicationAlert(legalCase.amdCcStatus)
              ? "legal-diary-row-publication"
              : /\b[BCDE]\b/.test((legalCase.amdCcStatus ?? "").toUpperCase())
                ? "legal-diary-row-no-show"
                : undefined;
            return (
              <tr key={legalCase.id} className={rowClass}>
                <td className="legal-table-action-col">
                  <Link
                    className="legal-table-edit-link"
                    href={`/app/cases/${legalCase.id}`}
                  >
                    Edit
                  </Link>
                </td>
                {columns.map((column) => {
                  const value = column.getValue(legalCase, rowIndex);
                  const isFile = column.label.toLowerCase().includes("file no");
                  return (
                    <td
                      key={column.key}
                      className={column.className}
                      title={value}
                    >
                      {isFile ? (
                        <Link href={`/app/cases/${legalCase.id}`}>
                          {value || "-"}
                        </Link>
                      ) : (
                        value || "-"
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
