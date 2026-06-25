"use client";

import { useFormState } from "react-dom";
import type { ImsActionState } from "@/app/app/ims/actions";
import type {
  FormLayout,
  FormLayoutBuiltinField,
  FormLayoutCustomField,
} from "@/lib/ims/form-fields";

const initial: ImsActionState = { ok: false, message: "" };

type DynamicFormProps = {
  layout: FormLayout;
  recordId?: string;
  builtinValues: Record<string, unknown>;
  customValues: Record<string, unknown>;
  action: (
    state: ImsActionState,
    formData: FormData,
  ) => Promise<ImsActionState>;
  submitLabel: string;
};

function numberDefault(value: unknown): number | string {
  if (value === undefined) {
    return 0;
  }
  if (value === null || value === "") {
    return "";
  }
  return Number(value);
}

function renderBuiltinField(
  field: FormLayoutBuiltinField,
  value: unknown,
  isEdit: boolean,
) {
  const required = field.locked && field.control !== "checkbox";

  if (field.control === "checkbox") {
    return (
      <label key={field.key} className="ws-ims-checkbox ws-ims-form-full">
        <input type="hidden" name={field.key} value="off" />
        <input
          name={field.key}
          type="checkbox"
          value="on"
          defaultChecked={value === undefined ? true : Boolean(value)}
        />
        {field.label}
      </label>
    );
  }

  if (field.control === "textarea") {
    return (
      <label key={field.key} className="ws-ims-form-full">
        {field.label}
        <textarea
          name={field.key}
          rows={2}
          defaultValue={value === null || value === undefined ? "" : String(value)}
        />
      </label>
    );
  }

  if (field.control === "select") {
    return (
      <label key={field.key}>
        {field.label}
        <select
          name={field.key}
          defaultValue={
            value !== null && value !== undefined
              ? String(value)
              : field.options[0]?.value ?? ""
          }
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.control === "number") {
    return (
      <label key={field.key}>
        {field.label}
        <input
          name={field.key}
          type="number"
          min={field.numberMin ?? undefined}
          step={field.numberStep ?? undefined}
          defaultValue={numberDefault(value)}
        />
      </label>
    );
  }

  return (
    <label key={field.key}>
      {field.label}
      {required ? " *" : null}
      <input
        name={field.key}
        required={required}
        defaultValue={value === null || value === undefined ? "" : String(value)}
        placeholder={field.placeholder ?? undefined}
        disabled={isEdit && field.key === "code"}
      />
    </label>
  );
}

function renderCustomField(field: FormLayoutCustomField, value: unknown) {
  const name = `cf_${field.key}`;
  const labelText = field.required ? `${field.label} *` : field.label;
  const help = field.helpText ? (
    <small className="ws-ims-help">{field.helpText}</small>
  ) : null;

  if (field.fieldType === "CHECKBOX") {
    return (
      <label key={field.key} className="ws-ims-checkbox ws-ims-form-full">
        <input type="hidden" name={name} value="off" />
        <input
          name={name}
          type="checkbox"
          value="on"
          defaultChecked={Boolean(value)}
        />
        <span>
          {labelText}
          {help}
        </span>
      </label>
    );
  }

  if (field.fieldType === "TEXTAREA") {
    return (
      <label key={field.key} className="ws-ims-form-full">
        {labelText}
        <textarea
          name={name}
          rows={2}
          required={field.required}
          defaultValue={value === null || value === undefined ? "" : String(value)}
        />
        {help}
      </label>
    );
  }

  if (field.fieldType === "SELECT") {
    return (
      <label key={field.key}>
        {labelText}
        <select
          name={name}
          required={field.required}
          defaultValue={value !== null && value !== undefined ? String(value) : ""}
        >
          {field.required ? null : <option value="">-</option>}
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {help}
      </label>
    );
  }

  const inputType =
    field.fieldType === "NUMBER"
      ? "number"
      : field.fieldType === "DATE"
        ? "date"
        : "text";

  return (
    <label key={field.key}>
      {labelText}
      <input
        name={name}
        type={inputType}
        step={field.fieldType === "NUMBER" ? "any" : undefined}
        required={field.required}
        defaultValue={value === null || value === undefined ? "" : String(value)}
      />
      {help}
    </label>
  );
}

export function ImsDynamicForm({
  layout,
  recordId,
  builtinValues,
  customValues,
  action,
  submitLabel,
}: DynamicFormProps) {
  const [state, formAction] = useFormState(action, initial);
  const isEdit = Boolean(recordId);

  return (
    <form action={formAction} className="ws-ims-form">
      {recordId ? <input type="hidden" name="id" value={recordId} /> : null}

      <div className="ws-ims-form-grid">
        {layout.builtins.map((field) =>
          renderBuiltinField(field, builtinValues[field.key], isEdit),
        )}
        {layout.custom.map((field) =>
          renderCustomField(field, customValues[field.key]),
        )}
      </div>

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
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
