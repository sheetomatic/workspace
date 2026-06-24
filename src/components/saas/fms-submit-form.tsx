"use client";

import { useActionState, useMemo, useState } from "react";
import type { FmsFormFieldType } from "@prisma/client";
import { submitFmsForm } from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";
import { isTimestampField, parseFieldOptions, parseTableColumns, parseTableFooterTotals } from "@/lib/fms/constants";
import { FmsIntakeTableField } from "@/components/saas/fms-intake-table-field";

type FormField = {
  fieldKey: string;
  label: string;
  fieldType: FmsFormFieldType;
  required: boolean;
  options: unknown;
  placeholder: string | null;
  helpText: string | null;
};

function fieldInputId(fieldKey: string) {
  return `fms-field-${fieldKey}`;
}

function resolveEnumChoices(field: FormField, values: Record<string, unknown>) {
  const parsed = parseFieldOptions(field.options);
  if (parsed.dependsOn && parsed.choicesByParent) {
    const parentValue = String(values[parsed.dependsOn] ?? "").trim();
    if (parentValue && parsed.choicesByParent[parentValue]) {
      return parsed.choicesByParent[parentValue];
    }
    return [];
  }
  return parsed.choices;
}

export function FmsSubmitForm({
  formId,
  formName,
  fields,
}: {
  formId: string;
  formName: string;
  fields: FormField[];
}) {
  const [state, formAction, pending] = useActionState(submitFmsForm, fmsInitialState);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const visibleFields = useMemo(
    () => fields.filter((field) => !isTimestampField(field)),
    [fields],
  );

  const dependentChildren = useMemo(() => {
    const map = new Map<string, FormField[]>();
    for (const field of visibleFields) {
      const parsed = parseFieldOptions(field.options);
      if (parsed.dependsOn) {
        const list = map.get(parsed.dependsOn) ?? [];
        list.push(field);
        map.set(parsed.dependsOn, list);
      }
    }
    return map;
  }, [visibleFields]);

  function setValue(key: string, value: unknown) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      const children = dependentChildren.get(key) ?? [];
      for (const child of children) {
        const childChoices = resolveEnumChoices(child, next);
        const current = String(next[child.fieldKey] ?? "");
        if (current && !childChoices.includes(current)) {
          next[child.fieldKey] = "";
        }
      }
      return next;
    });
  }

  function toggleEnumList(key: string, option: string) {
    setValues((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  }

  return (
    <form
      action={formAction}
      className="ws-fms-submit-form ws-fms-intake-form"
      encType="multipart/form-data"
    >
      <input type="hidden" name="formId" value={formId} />
      <input
        type="hidden"
        name="valuesJson"
        value={JSON.stringify(values)}
        readOnly
      />

      <header className="ws-fms-submit-header">
        <h2>{formName}</h2>
        <p className="ws-fms-muted">
          Submitting this form starts the linked FMS workflow when it is live.
        </p>
      </header>

      <div className="ws-fms-intake-fields">
        {visibleFields.map((field) => {
          const options = resolveEnumChoices(field, values);
          const parsed = parseFieldOptions(field.options);
          const inputId = fieldInputId(field.fieldKey);
          const labelId = `${inputId}-label`;
          const parentMissing =
            parsed.dependsOn &&
            !String(values[parsed.dependsOn] ?? "").trim();

          return (
            <div key={field.fieldKey} className="ws-fms-intake-field">
              <label
                className="ws-fms-intake-label"
                id={labelId}
                htmlFor={field.fieldType === "ENUM_LIST" ? undefined : inputId}
              >
                {field.label}
                {field.required ? (
                  <span className="ws-fms-intake-req" aria-hidden>
                    {" "}
                    *
                  </span>
                ) : null}
              </label>

              {field.helpText ? (
                <p className="ws-fms-intake-help">{field.helpText}</p>
              ) : null}

              {parentMissing ? (
                <p className="ws-fms-intake-help">Select the parent field first.</p>
              ) : null}

              <div className="ws-fms-intake-control">
                {field.fieldType === "TEXT" ||
                field.fieldType === "EMAIL" ||
                field.fieldType === "PHONE" ? (
                  <input
                    id={inputId}
                    className="ws-fms-intake-input"
                    type={
                      field.fieldType === "EMAIL"
                        ? "email"
                        : field.fieldType === "PHONE"
                          ? "tel"
                          : "text"
                    }
                    required={field.required}
                    placeholder={field.placeholder ?? undefined}
                    value={(values[field.fieldKey] as string) ?? ""}
                    onChange={(e) => setValue(field.fieldKey, e.target.value)}
                  />
                ) : null}

                {field.fieldType === "TEXTAREA" ? (
                  <textarea
                    id={inputId}
                    className="ws-fms-intake-input ws-fms-intake-textarea"
                    rows={4}
                    required={field.required}
                    placeholder={field.placeholder ?? undefined}
                    value={(values[field.fieldKey] as string) ?? ""}
                    onChange={(e) => setValue(field.fieldKey, e.target.value)}
                  />
                ) : null}

                {field.fieldType === "NUMBER" ? (
                  <input
                    id={inputId}
                    className="ws-fms-intake-input"
                    type="number"
                    required={field.required}
                    placeholder={field.placeholder ?? undefined}
                    value={(values[field.fieldKey] as string) ?? ""}
                    onChange={(e) => setValue(field.fieldKey, e.target.value)}
                  />
                ) : null}

                {field.fieldType === "DATE" ? (
                  <input
                    id={inputId}
                    className="ws-fms-intake-input"
                    type="date"
                    required={field.required}
                    value={(values[field.fieldKey] as string) ?? ""}
                    onChange={(e) => setValue(field.fieldKey, e.target.value)}
                  />
                ) : null}

                {field.fieldType === "DATETIME" ? (
                  <input
                    id={inputId}
                    className="ws-fms-intake-input"
                    type="datetime-local"
                    required={field.required}
                    value={(values[field.fieldKey] as string) ?? ""}
                    onChange={(e) => setValue(field.fieldKey, e.target.value)}
                  />
                ) : null}

                {field.fieldType === "ENUM" ? (
                  <select
                    id={inputId}
                    className="ws-fms-intake-input"
                    required={field.required}
                    disabled={Boolean(parentMissing)}
                    value={(values[field.fieldKey] as string) ?? ""}
                    onChange={(e) => setValue(field.fieldKey, e.target.value)}
                  >
                    <option value="">
                      {parentMissing ? "Select parent first..." : "Select..."}
                    </option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : null}

                {field.fieldType === "ENUM_LIST" ? (
                  <div
                    className="ws-fms-intake-options"
                    role="group"
                    aria-labelledby={labelId}
                  >
                    {options.map((option) => {
                      const optionId = `${inputId}-${option.replace(/\s+/g, "-").toLowerCase()}`;
                      const selected = Array.isArray(values[field.fieldKey])
                        ? (values[field.fieldKey] as string[]).includes(option)
                        : false;
                      return (
                        <label
                          key={option}
                          htmlFor={optionId}
                          className={`ws-fms-intake-option${selected ? " is-selected" : ""}`}
                        >
                          <input
                            id={optionId}
                            type="checkbox"
                            checked={selected}
                            disabled={Boolean(parentMissing)}
                            onChange={() => toggleEnumList(field.fieldKey, option)}
                          />
                          <span className="ws-fms-intake-option-text">{option}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}

                {field.fieldType === "FILE" ? (
                  <div className="ws-fms-intake-file">
                    <input
                      id={inputId}
                      type="file"
                      name={`file_${field.fieldKey}`}
                      required={field.required}
                      className="ws-fms-intake-file-input"
                    />
                  </div>
                ) : null}

                {field.fieldType === "TABLE" ? (
                  <FmsIntakeTableField
                    fieldKey={field.fieldKey}
                    columns={parseTableColumns(field.options)}
                    footerTotals={parseTableFooterTotals(field.options)}
                    value={values[field.fieldKey]}
                    required={field.required}
                    onChange={(rows) => setValue(field.fieldKey, rows)}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {state.message ? (
        <p className={state.ok ? "ws-form-success" : "ws-form-error"}>{state.message}</p>
      ) : null}

      <div className="form-actions ws-fms-form-actions">
        <button type="submit" className="btn-primary ws-sf-btn-primary" disabled={pending}>
          {pending ? "Submitting..." : "Submit & start FMS"}
        </button>
      </div>
    </form>
  );
}
