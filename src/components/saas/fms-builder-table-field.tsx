"use client";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import {
  isCalculatedTableColumn,
  moveTableColumn,
  newTableColumn,
  newTableFooterTotal,
  removeTableColumnAt,
  resolveTableColumnChoices,
  resolveTableColumns,
  tableColumnUsesSelect,
  updateTableColumn,
  type FmsTableColumn,
  type FmsTableColumnType,
  type FmsTableFooterTotal,
  type FmsTableFormulaOp,
} from "@/lib/fms/constants";
import {
  describeColumnFormula,
  numericSourceColumns,
  summableTableColumns,
} from "@/lib/fms/table-calculations";

const COLUMN_TYPE_LABELS: Record<FmsTableColumnType, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  ENUM: "Dropdown",
  CALCULATED: "Calculated",
};

const FORMULA_OPERATIONS: FmsTableFormulaOp[] = [
  "MULTIPLY",
  "ADD",
  "SUBTRACT",
  "DIVIDE",
];

export function FmsBuilderTableField({
  columns,
  onChange,
  onActivate,
}: {
  columns: FmsTableColumn[];
  onChange: (columns: FmsTableColumn[]) => void;
  onActivate?: () => void;
}) {
  const tableColumns = resolveTableColumns(columns);
  const canDeleteColumn = tableColumns.length > 1;

  return (
    <div
      className="ws-fms-builder-table"
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("input, select, textarea, button")) {
          return;
        }
        onActivate?.();
      }}
    >
      <div className="ws-fms-builder-table-scroll">
        <table className="ws-fms-builder-table-grid">
          <thead>
            <tr>
              {tableColumns.map((column, index) => (
                <th key={`${column.key}-${index}`}>
                  <div className="ws-fms-builder-table-head-cell">
                    <input
                      className="ws-fms-builder-table-head-input"
                      value={column.label}
                      placeholder="Column label"
                      aria-label={`Column ${index + 1} label`}
                      onFocus={() => onActivate?.()}
                      onChange={(event) =>
                        onChange(
                          updateTableColumn(tableColumns, index, {
                            label: event.target.value,
                          }),
                        )
                      }
                    />
                    <div
                      className="ws-fms-builder-table-head-actions"
                      aria-label={`${column.label} column actions`}
                    >
                      <button
                        type="button"
                        className="ws-fms-builder-table-head-btn"
                        aria-label={`Move ${column.label} left`}
                        title="Move left"
                        disabled={index === 0}
                        onClick={() =>
                          onChange(moveTableColumn(tableColumns, index, "left"))
                        }
                      >
                        <ChevronLeft size={13} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="ws-fms-builder-table-head-btn"
                        aria-label={`Move ${column.label} right`}
                        title="Move right"
                        disabled={index === tableColumns.length - 1}
                        onClick={() =>
                          onChange(moveTableColumn(tableColumns, index, "right"))
                        }
                      >
                        <ChevronRight size={13} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="ws-fms-builder-table-head-btn ws-fms-builder-table-head-delete"
                        aria-label={`Delete ${column.label} column`}
                        title="Delete column"
                        disabled={!canDeleteColumn}
                        onClick={() =>
                          onChange(removeTableColumnAt(tableColumns, index))
                        }
                      >
                        <Trash2 size={13} aria-hidden />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {tableColumns.map((column, index) => {
                if (isCalculatedTableColumn(column)) {
                  const formulaHint = describeColumnFormula(column);
                  return (
                    <td key={`${column.key}-preview-${index}`}>
                      <div className="ws-fms-intake-calc-value is-preview">
                        {formulaHint || "Auto"}
                      </div>
                    </td>
                  );
                }

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
      <div className="ws-fms-builder-table-toolbar">
        <button
          type="button"
          className="ws-fms-builder-table-add-col"
          onClick={() => onChange([...tableColumns, newTableColumn()])}
        >
          <Plus size={14} aria-hidden />
          Add column
        </button>
        <p className="ws-fms-muted ws-fms-builder-table-hint">
          Hover a column header to reorder or delete. Open field settings for
          column types, formulas, and table totals.
        </p>
      </div>
    </div>
  );
}

export function FmsTableColumnSettingsList({
  columns,
  footerTotals = [],
  onChange,
}: {
  columns: FmsTableColumn[];
  footerTotals?: FmsTableFooterTotal[];
  onChange: (patch: {
    tableColumns?: FmsTableColumn[];
    tableFooterTotals?: FmsTableFooterTotal[];
  }) => void;
}) {
  const tableColumns = resolveTableColumns(columns);
  const canDeleteColumn = tableColumns.length > 1;
  const numberColumns = numericSourceColumns(tableColumns);
  const summableColumns = summableTableColumns(tableColumns);

  function updateColumns(next: FmsTableColumn[]) {
    onChange({ tableColumns: next });
  }

  function updateFooterTotals(next: FmsTableFooterTotal[]) {
    onChange({ tableFooterTotals: next });
  }

  return (
    <div className="ws-fms-jf-table-columns">
      <div className="ws-fms-jf-table-columns-head">
        <div>
          <strong>Table columns</strong>
          <p className="ws-fms-muted ws-fms-jf-table-columns-sub">
            {tableColumns.length} column{tableColumns.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          className="ws-fms-jf-table-columns-add"
          onClick={() => updateColumns([...tableColumns, newTableColumn()])}
        >
          <Plus size={14} aria-hidden />
          Add column
        </button>
      </div>

      <div className="ws-fms-jf-table-column-list">
        {tableColumns.map((column, index) => (
          <article
            key={`${column.key}-${index}`}
            className="ws-fms-jf-table-column-card"
          >
            <header className="ws-fms-jf-table-column-card-head">
              <div>
                <strong>{column.label.trim() || "Untitled column"}</strong>
                <span className="ws-fms-jf-table-column-type">
                  {COLUMN_TYPE_LABELS[column.columnType]}
                  {column.required ? " - Required" : ""}
                  {describeColumnFormula(column)
                    ? ` - ${describeColumnFormula(column)}`
                    : ""}
                </span>
              </div>
              <div className="ws-fms-jf-table-column-card-actions">
                <button
                  type="button"
                  className="ws-fms-jf-table-column-icon"
                  aria-label="Move column up"
                  title="Move up"
                  disabled={index === 0}
                  onClick={() =>
                    updateColumns(moveTableColumn(tableColumns, index, "left"))
                  }
                >
                  <ChevronLeft size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  className="ws-fms-jf-table-column-icon"
                  aria-label="Move column down"
                  title="Move down"
                  disabled={index === tableColumns.length - 1}
                  onClick={() =>
                    updateColumns(moveTableColumn(tableColumns, index, "right"))
                  }
                >
                  <ChevronRight size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  className="ws-fms-jf-table-column-icon ws-fms-jf-table-column-delete"
                  aria-label={`Delete ${column.label} column`}
                  title="Delete column"
                  disabled={!canDeleteColumn}
                  onClick={() =>
                    updateColumns(removeTableColumnAt(tableColumns, index))
                  }
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            </header>

            <div className="ws-fms-jf-table-column-card-body">
              <label className="ws-fms-jf-option-field">
                Column label
                <input
                  value={column.label}
                  onChange={(event) =>
                    updateColumns(
                      updateTableColumn(tableColumns, index, {
                        label: event.target.value,
                      }),
                    )
                  }
                />
              </label>
              <label className="ws-fms-jf-option-field">
                Type
                <select
                  value={column.columnType}
                  onChange={(event) =>
                    updateColumns(
                      updateTableColumn(tableColumns, index, {
                        columnType: event.target.value as FmsTableColumnType,
                      }),
                    )
                  }
                >
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="ENUM">Dropdown</option>
                  <option value="CALCULATED">Calculated</option>
                </select>
              </label>

              {!isCalculatedTableColumn(column) ? (
                <label className="ws-fms-jf-option-check">
                  <input
                    type="checkbox"
                    checked={Boolean(column.required)}
                    onChange={(event) =>
                      updateColumns(
                        updateTableColumn(tableColumns, index, {
                          required: event.target.checked,
                        }),
                      )
                    }
                  />
                  Required in each row
                </label>
              ) : null}

              {column.columnType === "ENUM" ? (
                <label className="ws-fms-jf-option-field">
                  Dropdown choices (one per line)
                  <textarea
                    rows={3}
                    value={(column.choices ?? []).join("\n")}
                    onChange={(event) =>
                      updateColumns(
                        updateTableColumn(tableColumns, index, {
                          choices: event.target.value
                            .split("\n")
                            .map((choice) => choice.trim())
                            .filter(Boolean),
                        }),
                      )
                    }
                    placeholder={"Red\nBlue\nGreen"}
                  />
                </label>
              ) : null}

              {isCalculatedTableColumn(column) ? (
                <div className="ws-fms-jf-formula-block">
                  <label className="ws-fms-jf-option-field">
                    Formula
                    <select
                      value={column.formula?.operation ?? "MULTIPLY"}
                      onChange={(event) =>
                        updateColumns(
                          updateTableColumn(tableColumns, index, {
                            formula: {
                              operation: event.target
                                .value as FmsTableFormulaOp,
                              operandKeys: column.formula?.operandKeys ?? [],
                              decimals: column.formula?.decimals ?? 2,
                            },
                          }),
                        )
                      }
                    >
                      {FORMULA_OPERATIONS.map((operation) => (
                        <option key={operation} value={operation}>
                          {operation.charAt(0) +
                            operation.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ws-fms-jf-option-field">
                    First column
                    <select
                      value={column.formula?.operandKeys[0] ?? ""}
                      onChange={(event) => {
                        const operandKeys = [
                          ...(column.formula?.operandKeys ?? []),
                        ];
                        operandKeys[0] = event.target.value;
                        updateColumns(
                          updateTableColumn(tableColumns, index, {
                            formula: {
                              operation: column.formula?.operation ?? "MULTIPLY",
                              operandKeys,
                              decimals: column.formula?.decimals ?? 2,
                            },
                          }),
                        );
                      }}
                    >
                      <option value="">Select column...</option>
                      {numberColumns.map((source) => (
                        <option key={source.key} value={source.key}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ws-fms-jf-option-field">
                    Second column
                    <select
                      value={column.formula?.operandKeys[1] ?? ""}
                      onChange={(event) => {
                        const operandKeys = [
                          column.formula?.operandKeys[0] ?? "",
                          event.target.value,
                        ].filter(Boolean);
                        updateColumns(
                          updateTableColumn(tableColumns, index, {
                            formula: {
                              operation: column.formula?.operation ?? "MULTIPLY",
                              operandKeys,
                              decimals: column.formula?.decimals ?? 2,
                            },
                          }),
                        );
                      }}
                    >
                      <option value="">Select column...</option>
                      {numberColumns.map((source) => (
                        <option key={source.key} value={source.key}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ws-fms-jf-option-field">
                    Decimal places
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={column.formula?.decimals ?? 2}
                      onChange={(event) =>
                        updateColumns(
                          updateTableColumn(tableColumns, index, {
                            formula: {
                              operation: column.formula?.operation ?? "MULTIPLY",
                              operandKeys: column.formula?.operandKeys ?? [],
                              decimals: Math.min(
                                Math.max(Number(event.target.value) || 0, 0),
                                4,
                              ),
                            },
                          }),
                        )
                      }
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="ws-fms-jf-table-totals">
        <div className="ws-fms-jf-table-columns-head">
          <div>
            <strong>Table totals</strong>
            <p className="ws-fms-muted ws-fms-jf-table-columns-sub">
              Sum a column across all rows (e.g. grand total).
            </p>
          </div>
          <button
            type="button"
            className="ws-fms-jf-table-columns-add"
            onClick={() =>
              updateFooterTotals([...footerTotals, newTableFooterTotal()])
            }
          >
            <Plus size={14} aria-hidden />
            Add total
          </button>
        </div>

        {footerTotals.length === 0 ? (
          <p className="ws-fms-muted ws-fms-jf-table-totals-empty">
            No totals yet. Add one to show grand total quantity or amount below
            the table.
          </p>
        ) : (
          <div className="ws-fms-jf-table-column-list">
            {footerTotals.map((total, index) => (
              <article
                key={`${total.key}-${index}`}
                className="ws-fms-jf-table-column-card"
              >
                <header className="ws-fms-jf-table-column-card-head">
                  <strong>{total.label || "Table total"}</strong>
                  <button
                    type="button"
                    className="ws-fms-jf-table-column-icon ws-fms-jf-table-column-delete"
                    aria-label="Remove total"
                    onClick={() =>
                      updateFooterTotals(
                        footerTotals.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </header>
                <div className="ws-fms-jf-table-column-card-body">
                  <label className="ws-fms-jf-option-field">
                    Total label
                    <input
                      value={total.label}
                      onChange={(event) => {
                        const next = [...footerTotals];
                        next[index] = { ...total, label: event.target.value };
                        updateFooterTotals(next);
                      }}
                    />
                  </label>
                  <label className="ws-fms-jf-option-field">
                    Sum column
                    <select
                      value={total.columnKey}
                      onChange={(event) => {
                        const next = [...footerTotals];
                        next[index] = {
                          ...total,
                          columnKey: event.target.value,
                        };
                        updateFooterTotals(next);
                      }}
                    >
                      <option value="">Select column...</option>
                      {summableColumns.map((source) => (
                        <option key={source.key} value={source.key}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ws-fms-jf-option-field">
                    Decimal places
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={total.decimals ?? 2}
                      onChange={(event) => {
                        const next = [...footerTotals];
                        next[index] = {
                          ...total,
                          decimals: Math.min(
                            Math.max(Number(event.target.value) || 0, 0),
                            4,
                          ),
                        };
                        updateFooterTotals(next);
                      }}
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <p className="ws-fms-jf-field-key-hint ws-fms-muted">
        Calculated columns update live on submit. Submitters add rows only.
      </p>
    </div>
  );
}
