"use client";

import {
  FIELD_TYPE_OPTIONS,
  fieldOf,
  fieldTypeOf,
  type AppConfig,
  type AppView,
  type FieldType,
} from "@/lib/app-builder";
import type { SheetTab } from "@/lib/app-builder";

type Props = {
  tab: SheetTab;
  config: AppConfig;
  view?: AppView;
  focusCol: string;
  onFocusCol: (col: string) => void;
  onType: (col: string, type: FieldType) => void;
  onRename: (from: string, to: string) => void;
  onDelete: (col: string) => void;
  onKey: (col: string) => void;
  onLabel: (col: string) => void;
  onFormula: (col: string) => void;
};

export function TableColumnsPanel({
  tab,
  config,
  view,
  focusCol,
  onFocusCol,
  onType,
  onRename,
  onDelete,
  onKey,
  onLabel,
  onFormula,
}: Props) {
  const computed = (config.computed || []).filter((col) => col.tab === tab.name);

  return (
    <div className="ab-cols">
      <table>
        <thead>
          <tr>
            <th className="idx">#</th>
            <th />
            <th>Name</th>
            <th>Type</th>
            <th>Key?</th>
            <th>Label?</th>
            <th>Formula</th>
            <th>Show_if</th>
            <th>Edit_if</th>
            <th>Required_if</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tab.headers.map((col, index) => {
            const field = fieldOf(view, col);
            const type = fieldTypeOf(view, col, tab.rows.map((row) => row.cells[col]));
            const virtual = type === "virtual" || field?.virtual;
            const formula =
              field?.formula ||
              computed.find((item) => item.name === col)?.formula ||
              "";
            return (
              <tr key={col} className={focusCol === col ? "on" : ""}>
                <td className="idx">{index + 1}</td>
                <td>
                  <button type="button" className="ab-cols-edit" onClick={() => onFocusCol(col)}>
                    Edit
                  </button>
                </td>
                <td>
                  <input
                    defaultValue={col}
                    key={col}
                    aria-label={`Name for ${col}`}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next && next !== col) onRename(col, next);
                    }}
                    onFocus={() => onFocusCol(col)}
                  />
                </td>
                <td>
                  <select
                    value={type}
                    aria-label={`Type for ${col}`}
                    onChange={(e) => onType(col, e.target.value as FieldType)}
                  >
                    {FIELD_TYPE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={view?.keyCol === col}
                    aria-label={`${col} is key`}
                    onChange={() => onKey(col)}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={view?.titleCol === col}
                    aria-label={`${col} is label`}
                    onChange={() => onLabel(col)}
                  />
                </td>
                <td>
                  {virtual || formula ? (
                    <button type="button" className="ab-cols-fx" onClick={() => onFormula(col)}>
                      = {formula || "Formula"}
                    </button>
                  ) : (
                    <button type="button" className="ab-cols-fx is-off" onClick={() => onFormula(col)}>
                      =
                    </button>
                  )}
                </td>
                <td>
                  <button type="button" className={field?.showIf ? "ab-cols-fx" : "ab-cols-fx is-off"} onClick={() => onFocusCol(col)}>
                    {field?.showIf || "—"}
                  </button>
                </td>
                <td>
                  <button type="button" className={field?.editIf ? "ab-cols-fx" : "ab-cols-fx is-off"} onClick={() => onFocusCol(col)}>
                    {field?.editIf || "—"}
                  </button>
                </td>
                <td>
                  <button type="button" className={field?.requiredIf ? "ab-cols-fx" : "ab-cols-fx is-off"} onClick={() => onFocusCol(col)}>
                    {field?.requiredIf || "—"}
                  </button>
                </td>
                <td>
                  <button type="button" className="linkish" onClick={() => onDelete(col)}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
