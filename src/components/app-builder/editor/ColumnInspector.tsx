"use client";

import { useState } from "react";
import {
  FIELD_TYPE_OPTIONS,
  suggestAppSheetFormula,
  type AppConfig,
  type AppFormField,
  type FieldType,
} from "@/lib/app-builder";

type Section = "type" | "valid" | "behavior" | "access";

type Props = {
  col: string;
  type: FieldType;
  field?: AppFormField;
  tables: string[];
  tabName: string;
  headers: string[];
  config: AppConfig;
  viewOwner?: string;
  onApply: (type: FieldType, extras: Partial<AppFormField>) => void;
  onConfigChange: (next: AppConfig) => void;
  onRename: (next: string) => void;
  onDone: () => void;
};

function FormulaField({
  label,
  hint,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  hint?: string;
  value?: string;
  placeholder: string;
  onSave: (next: string | undefined) => void;
}) {
  return (
    <label className="col-fx">
      <span>
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
      <i>=</i>
      <input
        key={`${label}-${value || ""}`}
        defaultValue={value || ""}
        placeholder={placeholder}
        onBlur={(e) => onSave(e.target.value.trim() || undefined)}
      />
    </label>
  );
}

export function ColumnInspector({
  col,
  type,
  field,
  tables,
  tabName,
  headers,
  config,
  viewOwner,
  onApply,
  onConfigChange,
  onRename,
  onDone,
}: Props) {
  const [open, setOpen] = useState<Record<Section, boolean>>({
    type: false,
    valid: true,
    behavior: true,
    access: false,
  });
  const hiddenFromStaff = config.visibility?.some(
    (rule) => rule.target === "field" && rule.targetId === col && rule.when === "owner",
  );
  const typeLabel = FIELD_TYPE_OPTIONS.find((item) => item.id === type)?.label || type;
  const ownerElsewhere = viewOwner && viewOwner !== col ? viewOwner : null;
  const shown = field?.showIf?.trim().toLowerCase() !== "false";

  function toggle(section: Section) {
    setOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <aside className="col-inspector" aria-label={`${tabName} : ${col}`}>
      <header>
        <div>
          <strong>
            {tabName} : {col}
          </strong>
          <p>type: {typeLabel}</p>
        </div>
        <button type="button" className="btn ghost" onClick={onDone}>
          Done
        </button>
      </header>

      <label className="col-fx">
        <span>
          Column name
          <small>Must match the Sheet column.</small>
        </span>
        <input
          key={col}
          defaultValue={col}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next && next !== col) onRename(next);
          }}
        />
      </label>

      <label className="col-show">
        <span>
          Show?
          <small>Visible in the app. Add Show_if to decide per row.</small>
        </span>
        <input
          type="checkbox"
          checked={shown}
          onChange={(e) => onApply(type, { showIf: e.target.checked ? undefined : "false" })}
        />
        <input
          key={`show-${col}-${field?.showIf || ""}`}
          defaultValue={shown ? field?.showIf || "" : ""}
          placeholder={'[Stage]="Won"'}
          disabled={!shown}
          onBlur={(e) => onApply(type, { showIf: e.target.value.trim() || undefined })}
        />
      </label>

      <label className="col-fx">
        <span>
          Type
          <small>Column data type</small>
        </span>
        <select value={type} onChange={(e) => onApply(e.target.value as FieldType, {})}>
          {FIELD_TYPE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <section className="col-acc">
        <button type="button" className={open.type ? "on" : ""} onClick={() => toggle("type")}>
          Type Details
        </button>
        {open.type ? (
          <div>
            {type === "number" || type === "date" ? (
              <div className="col-inspector-row">
                <label>
                  Format
                  <select
                    value={field?.format?.kind || (type === "date" ? "date" : "number")}
                    onChange={(e) =>
                      onApply(type, {
                        format: {
                          ...field?.format,
                          kind: e.target.value as NonNullable<AppFormField["format"]>["kind"],
                        },
                      })
                    }
                  >
                    {type === "date" ? (
                      <option value="date">Date</option>
                    ) : (
                      <>
                        <option value="number">Number</option>
                        <option value="currency">Currency</option>
                        <option value="percent">Percent</option>
                      </>
                    )}
                  </select>
                </label>
                {type === "number" ? (
                  <label>
                    Decimals
                    <input
                      key={`dec-${col}`}
                      defaultValue={String(
                        field?.format?.decimals ?? (field?.format?.kind === "currency" ? 2 : 0),
                      )}
                      onBlur={(e) =>
                        onApply(type, {
                          format: { ...field?.format, decimals: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </label>
                ) : (
                  <label>
                    Date style
                    <select
                      value={field?.format?.dateStyle || "short"}
                      onChange={(e) =>
                        onApply(type, {
                          format: {
                            ...field?.format,
                            kind: "date",
                            dateStyle: e.target.value as "short" | "medium" | "long",
                          },
                        })
                      }
                    >
                      <option value="short">Short</option>
                      <option value="medium">Medium</option>
                      <option value="long">Long</option>
                    </select>
                  </label>
                )}
              </div>
            ) : null}
            {field?.format?.kind === "currency" ? (
              <label>
                Currency
                <select
                  value={field.format.currency || "INR"}
                  onChange={(e) =>
                    onApply(type, { format: { ...field.format, kind: "currency", currency: e.target.value } })
                  }
                >
                  <option value="INR">INR ₹</option>
                  <option value="USD">USD $</option>
                  <option value="EUR">EUR €</option>
                </select>
              </label>
            ) : null}
            {type === "enum" || type === "choice" ? (
              <label>
                Dropdown values
                <input
                  key={`opt-${col}`}
                  defaultValue={(field?.options || []).join(", ")}
                  placeholder="New, Quote, Won"
                  onBlur={(e) =>
                    onApply(type, {
                      options: e.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
            ) : null}
            {type === "ref" ? (
              <div className="col-inspector-row">
                <label>
                  Referenced table
                  <select
                    value={field?.refTab || ""}
                    onChange={(e) => onApply("ref", { refTab: e.target.value })}
                  >
                    <option value="">Pick table</option>
                    {tables
                      .filter((item) => item !== tabName)
                      .map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Key / label
                  <input
                    key={`ref-${col}`}
                    defaultValue={field?.refLabelCol || field?.refKeyCol || ""}
                    placeholder="Name"
                    onBlur={(e) =>
                      onApply("ref", {
                        refKeyCol: e.target.value.trim(),
                        refLabelCol: e.target.value.trim(),
                      })
                    }
                  />
                </label>
              </div>
            ) : null}
            {type === "file" ? (
              <label>
                Folder
                <input
                  key={`file-${col}`}
                  defaultValue={field?.fileFolder || ""}
                  placeholder={`${tabName}/Files`}
                  onBlur={(e) => onApply("file", { fileFolder: e.target.value.trim() })}
                />
              </label>
            ) : null}
            {type === "virtual" ? (
              <>
                <FormulaField
                  label="App formula"
                  value={field?.formula}
                  placeholder='CONCATENATE([Name]," — ",[Company])'
                  onSave={(formula) => onApply("virtual", { formula: formula || "", virtual: true })}
                />
                <div className="col-inspector-row">
                  <input
                    placeholder="AI: combine name and company"
                    onBlur={(e) => {
                      const hint = e.target.value.trim();
                      if (!hint) return;
                      onApply("virtual", {
                        formula: suggestAppSheetFormula(hint, headers),
                        virtual: true,
                      });
                      e.target.value = "";
                    }}
                  />
                </div>
              </>
            ) : null}
            {type !== "number" &&
            type !== "date" &&
            type !== "enum" &&
            type !== "choice" &&
            type !== "ref" &&
            type !== "file" &&
            type !== "virtual" ? (
              <p>No extra type options.</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="col-acc">
        <button type="button" className={open.valid ? "on" : ""} onClick={() => toggle("valid")}>
          Data Validity
        </button>
        {open.valid ? (
          <div>
            <FormulaField
              label="Valid If"
              hint="Does this column contain valid data?"
              value={field?.validIf}
              placeholder="[Qty]>0"
              onSave={(validIf) => onApply(type, { validIf })}
            />
            <FormulaField
              label="Invalid value error"
              hint="Shown when Valid If is false."
              value={field?.invalidMessage}
              placeholder="Enter a valid value"
              onSave={(invalidMessage) => onApply(type, { invalidMessage })}
            />
            <label className="col-show">
              <span>
                Require?
                <small>Must be filled. Or use Required_if.</small>
              </span>
              <input
                type="checkbox"
                checked={!!field?.required}
                onChange={(e) => onApply(type, { required: e.target.checked })}
              />
              <input
                key={`reqif-${col}-${field?.requiredIf || ""}`}
                defaultValue={field?.requiredIf || ""}
                placeholder="ISNOTBLANK([Party])"
                onBlur={(e) => onApply(type, { requiredIf: e.target.value.trim() || undefined })}
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="col-acc">
        <button type="button" className={open.behavior ? "on" : ""} onClick={() => toggle("behavior")}>
          Behavior
        </button>
        {open.behavior ? (
          <div>
            <FormulaField
              label="Show_if"
              value={shown ? field?.showIf : undefined}
              placeholder={'[Stage]="Won"'}
              onSave={(showIf) => onApply(type, { showIf: shown ? showIf : "false" })}
            />
            <FormulaField
              label="Edit_if"
              value={field?.editIf}
              placeholder={'USERROLE()="Admin"'}
              onSave={(editIf) => onApply(type, { editIf })}
            />
            <FormulaField
              label="Required_if"
              value={field?.requiredIf}
              placeholder="ISNOTBLANK([Party])"
              onSave={(requiredIf) => onApply(type, { requiredIf })}
            />
            <FormulaField
              label="Valid_if"
              value={field?.validIf}
              placeholder="[Qty]>0"
              onSave={(validIf) => onApply(type, { validIf })}
            />
            <FormulaField
              label="Error message"
              value={field?.invalidMessage}
              placeholder="Enter a valid value"
              onSave={(invalidMessage) => onApply(type, { invalidMessage })}
            />
          </div>
        ) : null}
      </section>

      <section className="col-acc">
        <button type="button" className={open.access ? "on" : ""} onClick={() => toggle("access")}>
          Who sees this
        </button>
        {open.access ? (
          <div>
            <label className="check">
              <input
                type="checkbox"
                checked={viewOwner === col}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    views: config.views.map((item) =>
                      item.tab === tabName
                        ? { ...item, ownerCol: e.target.checked ? col : undefined }
                        : item,
                    ),
                  })
                }
              />
              <span>
                <b>Staff only see their own rows</b>
                <em>
                  {viewOwner === col
                    ? `On. A PIN only opens rows where ${col} is their name or email.`
                    : ownerElsewhere
                      ? `${ownerElsewhere} already does this.`
                      : "Tick this on a name or email column."}
                </em>
              </span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={!!hiddenFromStaff}
                onChange={(e) => {
                  const rest = (config.visibility || []).filter(
                    (rule) => !(rule.target === "field" && rule.targetId === col),
                  );
                  onConfigChange({
                    ...config,
                    visibility: e.target.checked
                      ? [...rest, { id: `vis-field-${col}`, target: "field", targetId: col, when: "owner" }]
                      : rest,
                  });
                }}
              />
              <span>
                <b>Hide from staff</b>
                <em>Owners still see it.</em>
              </span>
            </label>
          </div>
        ) : null}
      </section>
    </aside>
  );
}
