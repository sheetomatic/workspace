"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  deleteImsCustomFieldAction,
  moveImsCustomFieldAction,
  saveImsCustomFieldAction,
  saveImsFieldSettingsAction,
  type ImsActionState,
} from "@/app/app/ims/actions";
import {
  getBuiltinFields,
  type ImsCustomFieldType,
  type ImsFormEntity,
} from "@/lib/ims/form-fields";

const initialState: ImsActionState = { ok: false, message: "" };

const CUSTOM_FIELD_TYPES: { value: ImsCustomFieldType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "TEXTAREA", label: "Text area" },
  { value: "NUMBER", label: "Number" },
  { value: "SELECT", label: "Dropdown" },
  { value: "DATE", label: "Date" },
  { value: "CHECKBOX", label: "Checkbox" },
];

const CUSTOM_FIELD_TYPE_LABELS: Record<ImsCustomFieldType, string> =
  Object.fromEntries(
    CUSTOM_FIELD_TYPES.map((type) => [type.value, type.label]),
  ) as Record<ImsCustomFieldType, string>;

export type FieldSettingRow = {
  fieldKey: string;
  label: string | null;
  hidden: boolean;
  sortOrder: number;
};

export type CustomFieldRowData = {
  id: string;
  key: string;
  label: string;
  fieldType: ImsCustomFieldType;
  options: string[];
  required: boolean;
  helpText: string | null;
  sortOrder: number;
  isActive: boolean;
};

type EditableBuiltin = {
  key: string;
  defaultLabel: string;
  label: string;
  hidden: boolean;
};

function BuiltinFieldsEditor({
  entity,
  builtins,
  fieldSettings,
}: {
  entity: ImsFormEntity;
  builtins: ReturnType<typeof getBuiltinFields>;
  fieldSettings: FieldSettingRow[];
}) {
  const [state, action] = useActionState(saveImsFieldSettingsAction, initialState);

  const settingMap = new Map(fieldSettings.map((s) => [s.fieldKey, s]));

  const nonLocked = builtins.filter((field) => !field.locked);
  const initialRows: EditableBuiltin[] = nonLocked
    .map((field, index) => {
      const setting = settingMap.get(field.key);
      return {
        key: field.key,
        defaultLabel: field.defaultLabel,
        label: setting?.label ?? "",
        hidden: setting?.hidden ?? false,
        sortOrder: setting?.sortOrder ?? index,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ key, defaultLabel, label, hidden }) => ({
      key,
      defaultLabel,
      label,
      hidden,
    }));

  const [rows, setRows] = useState<EditableBuiltin[]>(initialRows);

  const lockedFields = builtins.filter((field) => field.locked);

  function updateLabel(index: number, value: string) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, label: value } : row)),
    );
  }

  function toggleHidden(index: number) {
    setRows((current) =>
      current.map((row, i) =>
        i === index ? { ...row, hidden: !row.hidden } : row,
      ),
    );
  }

  function move(index: number, direction: "up" | "down") {
    setRows((current) => {
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= current.length) {
        return current;
      }
      const next = current.slice();
      const tmp = next[index];
      next[index] = next[swapWith];
      next[swapWith] = tmp;
      return next;
    });
  }

  const payload = JSON.stringify(
    rows.map((row, index) => ({
      fieldKey: row.key,
      label: row.label.trim() || null,
      hidden: row.hidden,
      sortOrder: index,
    })),
  );

  return (
    <div className="ws-ims-builder-section">
      <h3>Built-in fields</h3>
      <p className="ws-ims-help">
        Rename, hide, or reorder the standard fields. Code, name, and the active
        toggle always show.
      </p>

      <div className="ws-ims-builder-list">
        {rows.map((row, index) => (
          <div key={row.key} className="ws-ims-builder-row">
            <div className="ws-ims-builder-move">
              <button
                type="button"
                className="ws-ims-icon-btn"
                onClick={() => move(index, "up")}
                disabled={index === 0}
                aria-label="Move up"
                title="Move up"
              >
                {"\u2191"}
              </button>
              <button
                type="button"
                className="ws-ims-icon-btn"
                onClick={() => move(index, "down")}
                disabled={index === rows.length - 1}
                aria-label="Move down"
                title="Move down"
              >
                {"\u2193"}
              </button>
            </div>
            <input
              className="ws-ims-builder-rename"
              value={row.label}
              placeholder={row.defaultLabel}
              onChange={(event) => updateLabel(index, event.target.value)}
            />
            <label className="ws-ims-builder-toggle">
              <input
                type="checkbox"
                checked={!row.hidden}
                onChange={() => toggleHidden(index)}
              />
              {row.hidden ? "Hidden" : "Visible"}
            </label>
          </div>
        ))}
      </div>

      {lockedFields.length > 0 ? (
        <div className="ws-ims-builder-locked">
          {lockedFields.map((field) => (
            <span key={field.key} className="ws-ims-line-tag ws-ims-line-tag-muted">
              {field.defaultLabel} (locked)
            </span>
          ))}
        </div>
      ) : null}

      <form action={action} className="ws-ims-builder-save">
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="settings" value={payload} />
        <button type="submit" className="ws-btn-primary">
          Save built-in layout
        </button>
        {state.message ? (
          <span
            className={
              state.ok
                ? "ws-ims-feedback"
                : "ws-ims-feedback ws-ims-feedback-error"
            }
          >
            {state.message}
          </span>
        ) : null}
      </form>
    </div>
  );
}

function CustomFieldRow({
  entity,
  field,
  isFirst,
  isLast,
}: {
  entity: ImsFormEntity;
  field: CustomFieldRowData;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editType, setEditType] = useState<ImsCustomFieldType>(field.fieldType);
  const [moveState, moveAction] = useActionState(
    moveImsCustomFieldAction,
    initialState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteImsCustomFieldAction,
    initialState,
  );
  const [saveState, saveAction] = useActionState(
    saveImsCustomFieldAction,
    initialState,
  );

  return (
    <div className="ws-ims-builder-row ws-ims-builder-custom-row">
      <div className="ws-ims-builder-custom-head">
        <div className="ws-ims-builder-move">
          <form action={moveAction} className="ws-ims-row-move">
            <input type="hidden" name="id" value={field.id} />
            <button
              type="submit"
              name="direction"
              value="up"
              className="ws-ims-icon-btn"
              disabled={isFirst}
              aria-label="Move up"
              title="Move up"
            >
              {"\u2191"}
            </button>
            <button
              type="submit"
              name="direction"
              value="down"
              className="ws-ims-icon-btn"
              disabled={isLast}
              aria-label="Move down"
              title="Move down"
            >
              {"\u2193"}
            </button>
          </form>
        </div>

        <div className="ws-ims-builder-custom-info">
          <strong>{field.label}</strong>
          <span className="ws-ims-line-tag ws-ims-line-tag-muted">
            {CUSTOM_FIELD_TYPE_LABELS[field.fieldType]}
          </span>
          {field.required ? (
            <span className="ws-ims-pill ws-ims-pill-orange">Required</span>
          ) : null}
        </div>

        <div className="ws-ims-builder-custom-actions">
          <button
            type="button"
            className="ws-btn-secondary ws-btn-small"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? "Close" : "Edit"}
          </button>
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Delete the "${field.label}" field? Saved values stay on records but stop showing.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={field.id} />
            <button type="submit" className="ws-btn-danger ws-btn-small">
              Delete
            </button>
          </form>
        </div>
      </div>

      {moveState.message && !moveState.ok ? (
        <span className="ws-ims-row-error">{moveState.message}</span>
      ) : null}
      {deleteState.message && !deleteState.ok ? (
        <span className="ws-ims-row-error">{deleteState.message}</span>
      ) : null}

      {editing ? (
        <form action={saveAction} className="ws-ims-form ws-ims-builder-edit">
          <input type="hidden" name="id" value={field.id} />
          <input type="hidden" name="entity" value={entity} />
          <div className="ws-ims-form-grid">
            <label>
              Label
              <input name="label" required defaultValue={field.label} />
            </label>
            <label>
              Type
              <select
                name="fieldType"
                value={editType}
                onChange={(event) =>
                  setEditType(event.target.value as ImsCustomFieldType)
                }
              >
                {CUSTOM_FIELD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            {editType === "SELECT" ? (
              <label className="ws-ims-form-full">
                Options (one per line or comma separated)
                <textarea
                  name="options"
                  rows={3}
                  defaultValue={field.options.join("\n")}
                />
              </label>
            ) : null}
            <label className="ws-ims-form-full">
              Help text
              <input name="helpText" defaultValue={field.helpText ?? ""} />
            </label>
          </div>
          <label className="ws-ims-checkbox">
            <input
              name="required"
              type="checkbox"
              defaultChecked={field.required}
            />
            Required
          </label>
          {saveState.message ? (
            <p
              className={
                saveState.ok
                  ? "ws-ims-feedback"
                  : "ws-ims-feedback ws-ims-feedback-error"
              }
            >
              {saveState.message}
            </p>
          ) : null}
          <div className="ws-ims-form-actions">
            <button type="submit" className="ws-btn-primary">
              Update field
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function AddCustomField({ entity }: { entity: ImsFormEntity }) {
  const [state, action] = useActionState(saveImsCustomFieldAction, initialState);
  const [type, setType] = useState<ImsCustomFieldType>("TEXT");

  return (
    <form action={action} className="ws-ims-form ws-ims-builder-add">
      <input type="hidden" name="entity" value={entity} />
      <div className="ws-ims-form-grid">
        <label>
          Label
          <input name="label" required placeholder="e.g. Warranty months" />
        </label>
        <label>
          Type
          <select
            name="fieldType"
            value={type}
            onChange={(event) =>
              setType(event.target.value as ImsCustomFieldType)
            }
          >
            {CUSTOM_FIELD_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {type === "SELECT" ? (
          <label className="ws-ims-form-full">
            Options (one per line or comma separated)
            <textarea name="options" rows={3} placeholder={"Small\nMedium\nLarge"} />
          </label>
        ) : null}
        <label className="ws-ims-form-full">
          Help text
          <input name="helpText" placeholder="Optional hint shown under the field" />
        </label>
      </div>
      <label className="ws-ims-checkbox">
        <input name="required" type="checkbox" />
        Required
      </label>
      {state.message ? (
        <p
          className={
            state.ok
              ? "ws-ims-feedback"
              : "ws-ims-feedback ws-ims-feedback-error"
          }
        >
          {state.message}
        </p>
      ) : null}
      <div className="ws-ims-form-actions">
        <button type="submit" className="ws-btn-primary">
          Add custom field
        </button>
      </div>
    </form>
  );
}

export function ImsFormBuilder({
  entity,
  fieldSettings,
  customFields,
}: {
  entity: ImsFormEntity;
  fieldSettings: FieldSettingRow[];
  customFields: CustomFieldRowData[];
}) {
  const builtins = getBuiltinFields(entity);
  const sortedCustom = customFields
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="ws-ims-builder">
      <BuiltinFieldsEditor
        entity={entity}
        builtins={builtins}
        fieldSettings={fieldSettings}
      />

      <div className="ws-ims-builder-section">
        <h3>Custom fields</h3>
        <p className="ws-ims-help">
          Custom fields render after the built-in fields on the create and edit
          form, and their values are saved on each record.
        </p>

        {sortedCustom.length > 0 ? (
          <div className="ws-ims-builder-list">
            {sortedCustom.map((field, index) => (
              <CustomFieldRow
                key={field.id}
                entity={entity}
                field={field}
                isFirst={index === 0}
                isLast={index === sortedCustom.length - 1}
              />
            ))}
          </div>
        ) : (
          <p className="ws-ims-help">No custom fields yet.</p>
        )}

        <h4 className="ws-ims-builder-subhead">Add custom field</h4>
        <AddCustomField entity={entity} />
      </div>
    </div>
  );
}
