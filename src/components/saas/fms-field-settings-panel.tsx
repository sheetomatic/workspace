"use client";

import { Trash2 } from "lucide-react";
import type { FmsFormFieldType } from "@prisma/client";
import {
  FMS_FIELD_TYPE_LABELS,
  FMS_FORM_FIELD_TYPES,
  DEFAULT_PO_LINE_ITEM_COLUMNS,
  defaultFieldWidth,
  isHalfWidthFieldType,
  isTableFieldType,
  newTableColumn,
  slugifyFieldKey,
  updateTableColumn,
  type FmsFieldWidth,
  type FmsTableColumn,
  type FmsTableColumnType,
} from "@/lib/fms/constants";
import type { FormFieldDraft } from "@/components/saas/fms-form-builder";

const FIELD_TYPES = FMS_FORM_FIELD_TYPES;

function parseOptionTags(options: string) {
  return options
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
}

function parseLinesFromUpload(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isEnumType(fieldType: FmsFormFieldType) {
  return fieldType === "ENUM" || fieldType === "ENUM_LIST";
}

export function FmsFieldSettingsPanel({
  field,
  allFields,
  onUpdate,
  onRemove,
  onClose,
}: {
  field: FormFieldDraft;
  allFields: FormFieldDraft[];
  onUpdate: (patch: Partial<FormFieldDraft>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const showPlaceholder =
    field.fieldType !== "FILE" &&
    !isEnumType(field.fieldType) &&
    !isTableFieldType(field.fieldType);
  const showOptions = isEnumType(field.fieldType);
  const showTableColumns = isTableFieldType(field.fieldType);
  const canSetWidth = isHalfWidthFieldType(field.fieldType);
  const fieldKey = slugifyFieldKey(field.label.trim() || "field");
  const parentCandidates = allFields.filter(
    (candidate) =>
      candidate.id !== field.id &&
      isEnumType(candidate.fieldType) &&
      slugifyFieldKey(candidate.label.trim() || "field"),
  );
  const tableColumns =
    field.tableColumns.length > 0
      ? field.tableColumns
      : DEFAULT_PO_LINE_ITEM_COLUMNS.map((column) => ({ ...column }));

  async function handleChoicesUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    onUpdate({ options: parseLinesFromUpload(text).join("\n") });
    event.target.value = "";
  }

  async function handleDependentUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    onUpdate({ choicesByParentText: text });
    event.target.value = "";
  }

  return (
    <aside className="ws-fms-jf-props-panel" aria-label="Field settings">
      <header className="ws-fms-jf-props-head">
        <h3>Field settings</h3>
        <button type="button" className="ws-fms-jf-props-close" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="ws-fms-jf-props-body">
        <label className="ws-fms-jf-option-field">
          Field type
          <select
            value={field.fieldType}
            onChange={(event) => {
              const fieldType = event.target.value as FmsFormFieldType;
              onUpdate({
                fieldType,
                width: defaultFieldWidth(fieldType),
                tableColumns:
                  fieldType === "TABLE"
                    ? field.tableColumns.length
                      ? field.tableColumns
                      : DEFAULT_PO_LINE_ITEM_COLUMNS.map((column) => ({
                          ...column,
                        }))
                    : [],
              });
            }}
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {FMS_FIELD_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="ws-fms-jf-option-check">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(event) => onUpdate({ required: event.target.checked })}
          />
          Required
        </label>

        {canSetWidth ? (
          <label className="ws-fms-jf-option-field">
            Field width
            <select
              value={field.width}
              onChange={(event) =>
                onUpdate({ width: event.target.value as FmsFieldWidth })
              }
            >
              <option value="half">Half (2 columns)</option>
              <option value="full">Full width</option>
            </select>
          </label>
        ) : null}

        {showOptions ? (
          <>
            <label className="ws-fms-jf-option-check">
              <input
                type="checkbox"
                checked={field.dependsOnEnabled}
                onChange={(event) =>
                  onUpdate({
                    dependsOnEnabled: event.target.checked,
                    dependsOn: event.target.checked
                      ? field.dependsOn ||
                        slugifyFieldKey(parentCandidates[0]?.label.trim() || "")
                      : "",
                  })
                }
              />
              Depends on another field
            </label>

            {field.dependsOnEnabled ? (
              <>
                <label className="ws-fms-jf-option-field">
                  Parent field
                  <select
                    value={field.dependsOn}
                    onChange={(event) =>
                      onUpdate({ dependsOn: event.target.value })
                    }
                  >
                    <option value="">Select parent...</option>
                    {parentCandidates.map((candidate) => {
                      const key = slugifyFieldKey(
                        candidate.label.trim() || "field",
                      );
                      return (
                        <option key={candidate.id} value={key}>
                          {candidate.label.trim() || key}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className="ws-fms-jf-option-field">
                  Parent / child pairs (Category,Product per line)
                  <textarea
                    rows={4}
                    value={field.choicesByParentText}
                    onChange={(event) =>
                      onUpdate({ choicesByParentText: event.target.value })
                    }
                    placeholder={"Cat A,Product 1\nCat B,Product X"}
                  />
                </label>
                <label className="ws-fms-jf-option-field ws-fms-jf-upload-field">
                  Upload CSV (parent,child)
                  <input
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    onChange={(event) => void handleDependentUpload(event)}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="ws-fms-jf-option-field">
                  Choices (one per line)
                  <textarea
                    rows={3}
                    value={field.options}
                    onChange={(event) => onUpdate({ options: event.target.value })}
                    placeholder={"Option A\nOption B"}
                  />
                </label>
                <label className="ws-fms-jf-option-field ws-fms-jf-upload-field">
                  Upload values (one per line)
                  <input
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    onChange={(event) => void handleChoicesUpload(event)}
                  />
                </label>
              </>
            )}
            <p className="ws-fms-jf-field-key-hint ws-fms-muted">
              Field key: {fieldKey}
            </p>
          </>
        ) : null}

        {showTableColumns ? (
          <div className="ws-fms-jf-table-columns">
            <div className="ws-fms-jf-table-columns-head">
              <span>Table columns</span>
              <button
                type="button"
                className="ws-fms-jf-table-columns-add"
                onClick={() =>
                  onUpdate({
                    tableColumns: [...tableColumns, newTableColumn()],
                  })
                }
              >
                Add column
              </button>
            </div>
            {tableColumns.map((column, index) => (
              <div key={`${column.key}-${index}`} className="ws-fms-jf-table-column">
                <label className="ws-fms-jf-option-field">
                  Column label
                  <input
                    value={column.label}
                    onChange={(event) =>
                      onUpdate({
                        tableColumns: updateTableColumn(tableColumns, index, {
                          label: event.target.value,
                        }),
                      })
                    }
                  />
                </label>
                <label className="ws-fms-jf-option-field">
                  Type
                  <select
                    value={column.columnType}
                    onChange={(event) =>
                      onUpdate({
                        tableColumns: updateTableColumn(tableColumns, index, {
                          columnType: event.target.value as FmsTableColumnType,
                        }),
                      })
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
                      onUpdate({
                        tableColumns: updateTableColumn(tableColumns, index, {
                          required: event.target.checked,
                        }),
                      })
                    }
                  />
                  Required in each row
                </label>
                {column.columnType === "ENUM" ? (
                  <label className="ws-fms-jf-option-field">
                    Choices (one per line)
                    <textarea
                      rows={3}
                      value={(column.choices ?? []).join("\n")}
                      onChange={(event) =>
                        onUpdate({
                          tableColumns: updateTableColumn(tableColumns, index, {
                            choices: event.target.value
                              .split("\n")
                              .map((choice) => choice.trim())
                              .filter(Boolean),
                          }),
                        })
                      }
                      placeholder={"Pcs\nKg\nBox"}
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  className="ws-fms-jf-table-column-remove"
                  onClick={() =>
                    onUpdate({
                      tableColumns: tableColumns.filter(
                        (_, columnIndex) => columnIndex !== index,
                      ),
                    })
                  }
                  disabled={tableColumns.length <= 1}
                >
                  Remove column
                </button>
              </div>
            ))}
            <p className="ws-fms-jf-field-key-hint ws-fms-muted">
              Submitters can add and remove rows when filling the form.
            </p>
          </div>
        ) : null}

        {showPlaceholder ? (
          <label className="ws-fms-jf-option-field">
            Placeholder
            <input
              value={field.placeholder}
              onChange={(event) => onUpdate({ placeholder: event.target.value })}
              placeholder="Hint inside the input"
            />
          </label>
        ) : null}

        <label className="ws-fms-jf-option-field">
          Help text
          <input
            value={field.helpText}
            onChange={(event) => onUpdate({ helpText: event.target.value })}
            placeholder="Shown below the label"
          />
        </label>

        <button type="button" className="ws-fms-jf-remove" onClick={onRemove}>
          <Trash2 size={14} aria-hidden />
          Remove field
        </button>
      </div>
    </aside>
  );
}
