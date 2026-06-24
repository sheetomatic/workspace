import type { FmsFormFieldType } from "@prisma/client";
import {
  formatTableSummary,
  isCalculatedTableColumn,
  isTableFieldType,
  isTableRowArray,
  parseTableColumns,
  parseTableFooterTotals,
} from "@/lib/fms/constants";
import {
  applyTableCalculations,
  computeFooterTotal,
} from "@/lib/fms/table-calculations";

export function formatFmsFieldValueText(
  value: unknown,
  fieldType?: FmsFormFieldType,
  options?: unknown,
): string {
  if (fieldType === "TABLE") {
    return formatTableSummary(value, parseTableColumns(options));
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

export function FmsTableValueDisplay({
  value,
  options,
}: {
  value: unknown;
  options?: unknown;
}) {
  const columns = parseTableColumns(options);
  const footerTotals = parseTableFooterTotals(options);
  if (!isTableRowArray(value) || columns.length === 0) {
    return <span>-</span>;
  }

  const rows = applyTableCalculations(
    value.filter((row) =>
      columns.some((column) => String(row[column.key] ?? "").trim()),
    ),
    columns,
  );
  if (rows.length === 0) {
    return <span>-</span>;
  }

  const footerValues = footerTotals.map((total) => ({
    total,
    value: computeFooterTotal(rows, columns, total),
  }));

  return (
    <div className="ws-fms-intake-table-display">
      <table className="ws-fms-intake-table-display-grid">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>
                {column.label}
                {isCalculatedTableColumn(column) ? (
                  <span className="ws-fms-intake-calc-tag">Calc</span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={
                    isCalculatedTableColumn(column)
                      ? "ws-fms-intake-calc-value"
                      : undefined
                  }
                >
                  {String(row[column.key] ?? "").trim() || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footerValues.length > 0 ? (
        <div className="ws-fms-intake-table-footer">
          {footerValues.map(({ total, value: totalValue }) => (
            <div key={total.key} className="ws-fms-intake-table-footer-row">
              <span>{total.label}</span>
              <strong>{totalValue || "-"}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function renderFmsFieldValue(
  value: unknown,
  fieldType?: FmsFormFieldType,
  options?: unknown,
) {
  if (fieldType && isTableFieldType(fieldType) && isTableRowArray(value)) {
    return <FmsTableValueDisplay value={value} options={options} />;
  }
  if (value && typeof value === "object" && "attachmentId" in value) {
    const ref = value as { attachmentId: string; fileName?: string };
    const label = ref.fileName ?? "Download file";
    return (
      <a
        className="ws-fms-journey-attachment-link"
        href={`/api/fms/attachments/${ref.attachmentId}`}
      >
        {label}
      </a>
    );
  }
  return formatFmsFieldValueText(value, fieldType, options);
}
