"use client";

import { useActionState, useState } from "react";
import type { FmsFormFieldType } from "@prisma/client";
import { submitFmsForm } from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";

type FormField = {
  fieldKey: string;
  label: string;
  fieldType: FmsFormFieldType;
  required: boolean;
  options: unknown;
  placeholder: string | null;
  helpText: string | null;
};

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

  function setValue(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
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
    <form action={formAction} className="ws-sf-card ws-fms-submit-form">
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

      <div className="form-grid-premium">
        {fields.map((field) => {
          const options = Array.isArray(field.options)
            ? (field.options as string[])
            : [];

          return (
            <label
              key={field.fieldKey}
              className={
                field.fieldType === "TEXTAREA" ? "form-field-full" : undefined
              }
            >
              <span>
                {field.label}
                {field.required ? " *" : ""}
              </span>
              {field.helpText ? (
                <small className="ws-fms-help">{field.helpText}</small>
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
                  value={(values[field.fieldKey] as string) ?? ""}
                  onChange={(e) => setValue(field.fieldKey, e.target.value)}
                >
                  <option value="">Select...</option>
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
                  required={field.required}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      setValue(field.fieldKey, "");
                      return;
                    }
                    setValue(field.fieldKey, file.name);
                  }}
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
