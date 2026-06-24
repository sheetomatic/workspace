"use client";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import {
  moveTableColumn,
  newTableColumn,
  removeTableColumnAt,
  resolveTableColumnChoices,
  resolveTableColumns,
  tableColumnUsesSelect,
  updateTableColumn,
  type FmsTableColumn,
  type FmsTableColumnType,
} from "@/lib/fms/constants";

const COLUMN_TYPE_LABELS: Record<FmsTableColumnType, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  ENUM: "Dropdown",
};

export function FmsBuilderTableField({
  columns,
  onChange,
}: {
  columns: FmsTableColumn[];
  onChange: (columns: FmsTableColumn[]) => void;
}) {
  const tableColumns = resolveTableColumns(columns);
  const canDeleteColumn = tableColumns.length > 1;

  return (
    <div className="ws-fms-builder-table">
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
                      onChange={(event) =>
                        onChange(
                          updateTableColumn(tableColumns, index, {
                            label: event.target.value,
                          }),
                        )
                      }
                    />
                    <div className="ws-fms-builder-table-head-actions">
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
                        <ChevronLeft size={14} aria-hidden />
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
                        <ChevronRight size={14} aria-hidden />
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
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </div>
                    <span className="ws-fms-builder-table-type-pill">
                      {COLUMN_TYPE_LABELS[column.columnType]}
                    </span>
                  </div>
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
          Delete or reorder columns with the icons above each header. Set type
          and dropdown choices in field settings.
        </p>
      </div>
    </div>
  );
}

export function FmsTableColumnSettingsList({
  columns,
  onChange,
}: {
  columns: FmsTableColumn[];
  onChange: (columns: FmsTableColumn[]) => void;
}) {
  const tableColumns = resolveTableColumns(columns);
  const canDeleteColumn = tableColumns.length > 1;

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
          onClick={() => onChange([...tableColumns, newTableColumn()])}
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
                    onChange(moveTableColumn(tableColumns, index, "left"))
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
                    onChange(moveTableColumn(tableColumns, index, "right"))
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
                    onChange(removeTableColumnAt(tableColumns, index))
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
                    onChange(
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
                    onChange(
                      updateTableColumn(tableColumns, index, {
                        columnType: event.target.value as FmsTableColumnType,
                      }),
                    )
                  }
                >
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="ENUM">Dropdown</option>
                </select>
              </label>
              <label className="ws-fms-jf-option-check">
                <input
                  type="checkbox"
                  checked={Boolean(column.required)}
                  onChange={(event) =>
                    onChange(
                      updateTableColumn(tableColumns, index, {
                        required: event.target.checked,
                      }),
                    )
                  }
                />
                Required in each row
              </label>
              {column.columnType === "ENUM" ? (
                <label className="ws-fms-jf-option-field">
                  Dropdown choices (one per line)
                  <textarea
                    rows={3}
                    value={(column.choices ?? []).join("\n")}
                    onChange={(event) =>
                      onChange(
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
            </div>
          </article>
        ))}
      </div>

      <p className="ws-fms-jf-field-key-hint ws-fms-muted">
        Submitters add rows on the live form - they cannot delete columns.
      </p>
    </div>
  );
}
