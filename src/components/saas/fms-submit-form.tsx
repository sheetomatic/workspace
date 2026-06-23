"use client";

import { useActionState, useMemo, useState } from "react";
import type { FmsFormFieldType } from "@prisma/client";
import { submitFmsForm } from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";
import {
  isHalfWidthFieldType,
  isTimestampField,
  parseFieldOptions,
} from "@/lib/fms/constants";

type FormField = {
  fieldKey: string;
  label: string;
  fieldType: FmsFormFieldType;
  required: boolean;
  options: unknown;
  placeholder: string | null;
  helpText: string | null;
};

function fieldLayoutClass(field: FormField) {
  if (
    field.fieldType === "TEXTAREA" ||
    field.fieldType === "FILE" ||
    field.fieldType === "ENUM_LIST"
  ) {
    return "form-field-full";
  }
  const { width } = parseFieldOptions(field.options);
  if (isHalfWidthFieldType(field.fieldType) && width === "half") {
    return undefined;
  }
  return "form-field-full";
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
      className="ws-sf-card ws-fms-submit-form"
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

      <div className="form-grid-premium ws-fms-submit-grid">
        {visibleFields.map((field) => {
          const options = resolveEnumChoices(field, values);
          const parsed = parseFieldOptions(field.options);
          const layoutClass = fieldLayoutClass(field);
          const parentMissing =
            parsed.dependsOn &&
            !String(values[parsed.dependsOn] ?? "").trim();

          return (
            <label
              key={field.fieldKey}
              className={layoutClass}
            >
              <span>
                {field.label}
                {field.required ? " *" : ""}
              </span>
              {field.helpText ? (
                <small className="ws-fms-help">{field.helpText}</small>
              ) : null}
              {parentMissing ? (
                <small className="ws-fms-help">
                  Select the parent field first.
                </small>
              ) : null}

              {field.fieldType === "TEXT" ||
              field.fieldType === "EMAIL" ||
              field.fieldType === "PHONE" ? (
                <input
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
                  rows={4}
                  required={field.required}
                  placeholder={field.placeholder ?? undefined}
                  value={(values[field.fieldKey] as string) ?? ""}
                  onChange={(e) => setValue(field.fieldKey, e.target.value)}
                />
              ) : null}

              {field.fieldType === "NUMBER" ? (
                <input
                  type="number"
                  required={field.required}
                  placeholder={field.placeholder ?? undefined}
                  value={(values[field.fieldKey] as string) ?? ""}
                  onChange={(e) => setValue(field.fieldKey, e.target.value)}
                />
              ) : null}

              {field.fieldType === "DATE" ? (
                <input
                  type="date"
                  required={field.required}
                  value={(values[field.fieldKey] as string) ?? ""}
                  onChange={(e) => setValue(field.fieldKey, e.target.value)}
                />
              ) : null}

              {field.fieldType === "DATETIME" ? (
                <input
                  type="datetime-local"
                  required={field.required}
                  value={(values[field.fieldKey] as string) ?? ""}
                  onChange={(e) => setValue(field.fieldKey, e.target.value)}
                />
              ) : null}

              {field.fieldType === "ENUM" ? (
                <select
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
                <div className="ws-fms-enum-list">
                  {options.map((option) => {
                    const selected = Array.isArray(values[field.fieldKey])
                      ? (values[field.fieldKey] as string[]).includes(option)
                      : false;
                    return (
                      <label key={option} className="ws-fms-check-row">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={Boolean(parentMissing)}
                          onChange={() => toggleEnumList(field.fieldKey, option)}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {field.fieldType === "FILE" ? (
                <input
                  type="file"
                  name={`file_${field.fieldKey}`}
                  required={field.required}
                  className="ws-fms-attachment-field-input"
                />
              ) : null}
            </label>
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
