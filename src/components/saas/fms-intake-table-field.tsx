"use client";

import { Plus } from "lucide-react";
import type { FmsTableColumn, FmsTableRow } from "@/lib/fms/constants";
import {
  emptyTableRow,
  isTableRowArray,
  resolveTableColumnChoices,
  tableColumnUsesSelect,
} from "@/lib/fms/constants";

export function FmsIntakeTableField({
  fieldKey,
  columns,
  value,
  required,
  onChange,
}: {
  fieldKey: string;
  columns: FmsTableColumn[];
  value: unknown;
  required: boolean;
  onChange: (rows: FmsTableRow[]) => void;
}) {
  const rows = isTableRowArray(value) && value.length > 0
    ? value
    : [emptyTableRow(columns)];

  function updateRow(rowIndex: number, columnKey: string, cellValue: string) {
    const next = rows.map((row, index) =>
      index === rowIndex ? { ...row, [columnKey]: cellValue } : row,
    );
    onChange(next);
  }

  function addRow() {
    onChange([...rows, emptyTableRow(columns)]);
  }

  if (columns.length === 0) {
    return (
      <p className="ws-fms-intake-help">
        This table has no columns configured. Ask an admin to use Manage form and
        add columns.
      </p>
    );
  }

  return (
    <div className="ws-fms-intake-table">
      <div className="ws-fms-intake-table-scroll">
        <table className="ws-fms-intake-table-grid">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.label}
                  {column.required ? (
                    <span className="ws-fms-intake-req" aria-hidden>
                      {" "}
                      *
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${fieldKey}-row-${rowIndex}`}>
                {columns.map((column) => {
                  const inputId = `${fieldKey}-${rowIndex}-${column.key}`;
                  const cellValue = String(row[column.key] ?? "");
                  const choices = resolveTableColumnChoices(column);
                  const useSelect = tableColumnUsesSelect(column);

                  return (
                    <td key={column.key}>
                      {useSelect ? (
                        <select
                          id={inputId}
                          className="ws-fms-intake-input ws-fms-intake-table-input"
                          value={cellValue}
                          onChange={(event) =>
                            updateRow(rowIndex, column.key, event.target.value)
                          }
                        >
                          <option value="">Select...</option>
                          {choices.map((choice) => (
                            <option key={choice} value={choice}>
                              {choice}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={inputId}
                          className="ws-fms-intake-input ws-fms-intake-table-input"
                          type={
                            column.columnType === "NUMBER" ? "number" : "text"
                          }
                          value={cellValue}
                          placeholder={column.label}
                          onChange={(event) =>
                            updateRow(rowIndex, column.key, event.target.value)
                          }
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="ws-fms-intake-table-add"
        onClick={addRow}
      >
        <Plus size={14} aria-hidden />
        Add row
      </button>
    </div>
  );
}
