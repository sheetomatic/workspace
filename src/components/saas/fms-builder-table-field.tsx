"use client";

import { Plus } from "lucide-react";
import {
  DEFAULT_PO_LINE_ITEM_COLUMNS,
  newTableColumn,
  resolveTableColumnChoices,
  tableColumnUsesSelect,
  updateTableColumn,
  type FmsTableColumn,
} from "@/lib/fms/constants";

export function FmsBuilderTableField({
  columns,
  onChange,
}: {
  columns: FmsTableColumn[];
  onChange: (columns: FmsTableColumn[]) => void;
}) {
  const tableColumns = columns.length ? columns : DEFAULT_PO_LINE_ITEM_COLUMNS;

  return (
    <div className="ws-fms-builder-table">
      <div className="ws-fms-builder-table-scroll">
        <table className="ws-fms-builder-table-grid">
          <thead>
            <tr>
              {tableColumns.map((column, index) => (
                <th key={`${column.key}-${index}`}>
                  <input
                    className="ws-fms-builder-table-head-input"
                    value={column.label}
                    placeholder="Column label"
                    aria-label={`Column ${index + 1} label`}
                    onChange={(event) =>
                      onChange(
                        updateTableColumn(tableColumns, index, {
                          label: event.target.value,
                        }),
                      )
                    }
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {tableColumns.map((column, index) => {
                const choices = resolveTableColumnChoices(column);
                const useSelect = tableColumnUsesSelect(column);
                return (
                  <td key={`${column.key}-preview-${index}`}>
                    {useSelect ? (
                      <select
                        className="ws-fms-intake-input ws-fms-intake-table-input"
                        disabled
                        aria-hidden
                        tabIndex={-1}
                      >
                        <option>Select...</option>
                        {choices.map((choice) => (
                          <option key={choice}>{choice}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="ws-fms-intake-input ws-fms-intake-table-input"
                        disabled
                        placeholder={column.label}
                        aria-hidden
                        tabIndex={-1}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="ws-fms-builder-table-add-col"
        onClick={() => onChange([...tableColumns, newTableColumn()])}
      >
        <Plus size={14} aria-hidden />
        Add column
      </button>
      <p className="ws-fms-muted ws-fms-builder-table-hint">
        Set column type and dropdown choices in field settings (gear icon).
      </p>
    </div>
  );
}
