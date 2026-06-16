"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import type { FmsFormFieldType } from "@prisma/client";
import {
  createFmsForm,
  generateFmsFormFromAiAction,
  updateFmsForm,
} from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";
import { FmsFieldTypePopover } from "@/components/saas/fms-form-add-modal";
import { FMS_FIELD_TYPE_LABELS } from "@/lib/fms/constants";
import type { ParsedFmsFormDraft } from "@/lib/integrations/openai";

export type FormFieldDraft = {
  id: string;
  label: string;
  fieldType: FmsFormFieldType;
  required: boolean;
  options: string;
  placeholder: string;
  helpText: string;
};

const FIELD_TYPES: FmsFormFieldType[] = [
  "TEXT",
  "TEXTAREA",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "ENUM",
  "ENUM_LIST",
  "DATE",
  "DATETIME",
  "FILE",
];

const DEFAULT_LABELS: Partial<Record<FmsFormFieldType, string>> = {
  TEXT: "Short text",
  TEXTAREA: "Long text",
  EMAIL: "Email",
  PHONE: "Phone number",
  NUMBER: "Number",
  ENUM: "Single choice",
  ENUM_LIST: "Multiple choice",
  DATE: "Date",
  DATETIME: "Date & time",
  FILE: "File upload",
};

const DEFAULT_PLACEHOLDERS: Partial<Record<FmsFormFieldType, string>> = {
  TEXT: "Your answer",
  TEXTAREA: "Enter details...",
  EMAIL: "name@example.com",
  PHONE: "+91 98765 43210",
  NUMBER: "0",
};

function newField(type: FmsFormFieldType = "TEXT"): FormFieldDraft {
  return {
    id: crypto.randomUUID(),
    label: DEFAULT_LABELS[type] ?? "New field",
    fieldType: type,
    required: false,
    options: type === "ENUM" || type === "ENUM_LIST" ? "Option A\nOption B" : "",
    placeholder: DEFAULT_PLACEHOLDERS[type] ?? "",
    helpText: "",
  };
}

function toDraft(
  fields: {
    label: string;
    fieldType: FmsFormFieldType;
    required: boolean;
    options: unknown;
    placeholder: string | null;
    helpText: string | null;
  }[],
): FormFieldDraft[] {
  return fields.map((field) => ({
    id: crypto.randomUUID(),
    label: field.label,
    fieldType: field.fieldType,
    required: field.required,
    options: Array.isArray(field.options)
      ? (field.options as string[]).join("\n")
      : "",
    placeholder: field.placeholder ?? "",
    helpText: field.helpText ?? "",
  }));
}

function draftFromAi(draft: ParsedFmsFormDraft): {
  name: string;
  description: string;
  fields: FormFieldDraft[];
} {
  return {
    name: draft.name,
    description: draft.description,
    fields: draft.fields.map((field) => ({
      id: crypto.randomUUID(),
      label: field.label,
      fieldType: field.fieldType,
      required: field.required,
      options:
        field.fieldType === "ENUM" || field.fieldType === "ENUM_LIST"
          ? (field.options ?? []).join("\n")
          : "",
      placeholder: field.placeholder ?? DEFAULT_PLACEHOLDERS[field.fieldType] ?? "",
      helpText: field.helpText ?? "",
    })),
  };
}

function isAiErrorMessage(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("unavailable") ||
    lower.includes("limit") ||
    lower.includes("quota") ||
    lower.includes("error") ||
    lower.includes("failed") ||
    lower.includes("too long") ||
    lower.includes("empty") ||
    lower.includes("describe") ||
    lower.includes("refinement") ||
    lower.includes("words") ||
    lower.includes("network")
  );
}

function parseOptionTags(options: string) {
  return options
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
}

function isEnumType(fieldType: FmsFormFieldType) {
  return fieldType === "ENUM" || fieldType === "ENUM_LIST";
}

function previewPlaceholder(field: FormFieldDraft) {
  if (field.placeholder.trim()) {
    return field.placeholder;
  }
  return DEFAULT_PLACEHOLDERS[field.fieldType] ?? "";
}

function FieldPreviewStub({
  field,
  editorMode = false,
}: {
  field: FormFieldDraft;
  editorMode?: boolean;
}) {
  const options = parseOptionTags(field.options);

  return (
    <div className="ws-fms-jf-preview">
      {!editorMode ? (
        <>
          <span className="ws-fms-jf-preview-label">
            {field.label.trim() || "Untitled field"}
            {field.required ? <span className="ws-fms-jf-req">*</span> : null}
          </span>
          {field.helpText ? (
            <span className="ws-fms-jf-preview-help">{field.helpText}</span>
          ) : null}
        </>
      ) : field.helpText ? (
        <span className="ws-fms-jf-preview-help">{field.helpText}</span>
      ) : null}

      {field.fieldType === "TEXT" ||
      field.fieldType === "EMAIL" ||
      field.fieldType === "PHONE" ||
      field.fieldType === "NUMBER" ? (
        <span className="ws-fms-jf-stub">
          {previewPlaceholder(field) || "Your answer"}
        </span>
      ) : null}

      {field.fieldType === "TEXTAREA" ? (
        <span className="ws-fms-jf-stub ws-fms-jf-stub-tall">
          {previewPlaceholder(field) || "Enter details..."}
        </span>
      ) : null}

      {field.fieldType === "DATE" ? (
        <span className="ws-fms-jf-stub ws-fms-jf-stub-muted">dd/mm/yyyy</span>
      ) : null}

      {field.fieldType === "DATETIME" ? (
        <span className="ws-fms-jf-stub ws-fms-jf-stub-muted">
          dd/mm/yyyy, --:--
        </span>
      ) : null}

      {field.fieldType === "ENUM" ? (
        <span className="ws-fms-jf-stub ws-fms-jf-stub-muted">
          {options[0] ? `Select: ${options[0]}` : "Select..."}
        </span>
      ) : null}

      {field.fieldType === "ENUM_LIST" ? (
        <span className="ws-fms-jf-choices">
          {(options.length ? options : ["Option A", "Option B"]).map((option) => (
            <span key={option} className="ws-fms-jf-choice">
              <span className="ws-fms-jf-checkbox" aria-hidden />
              {option}
            </span>
          ))}
        </span>
      ) : null}

      {field.fieldType === "FILE" ? (
        <span className="ws-fms-jf-stub ws-fms-jf-stub-file">Choose file</span>
      ) : null}
    </div>
  );
}

function EditorField({
  field,
  expanded,
  onToggle,
  onUpdate,
  onRemove,
}: {
  field: FormFieldDraft;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<FormFieldDraft>) => void;
  onRemove: () => void;
}) {
  const showPlaceholder =
    field.fieldType !== "FILE" && !isEnumType(field.fieldType);
  const showOptions = isEnumType(field.fieldType);

  return (
    <div
      className={`ws-fms-jf-field${expanded ? " is-expanded" : ""}`}
      onClick={onToggle}
    >
      <div
        className="ws-fms-jf-field-toolbar"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          className="ws-fms-jf-field-label"
          value={field.label}
          onChange={(event) => onUpdate({ label: event.target.value })}
          placeholder="Field label"
          aria-label="Field label"
        />
        {field.required ? <span className="ws-fms-jf-req">*</span> : null}
        <select
          className="ws-fms-jf-field-type"
          value={field.fieldType}
          onChange={(event) =>
            onUpdate({ fieldType: event.target.value as FmsFormFieldType })
          }
          aria-label="Field type"
        >
          {FIELD_TYPES.map((type) => (
            <option key={type} value={type}>
              {FMS_FIELD_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <FieldPreviewStub field={field} editorMode />

      {expanded ? (
        <div
          className="ws-fms-jf-field-options"
          onClick={(event) => event.stopPropagation()}
        >
          <label className="ws-fms-jf-option-check">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(event) => onUpdate({ required: event.target.checked })}
            />
            Required
          </label>

          {showOptions ? (
            <label className="ws-fms-jf-option-field">
              Choices (one per line)
              <textarea
                rows={3}
                value={field.options}
                onChange={(event) => onUpdate({ options: event.target.value })}
                placeholder={"Option A\nOption B"}
              />
            </label>
          ) : null}

          {showPlaceholder ? (
            <label className="ws-fms-jf-option-field">
              Placeholder
              <input
                value={field.placeholder}
                onChange={(event) => onUpdate({ placeholder: event.target.value })}
                placeholder="Hint text inside the input"
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

          <button
            type="button"
            className="ws-fms-jf-remove"
            onClick={onRemove}
          >
            <Trash2 size={14} aria-hidden />
            Remove field
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function FmsFormBuilder({
  formId,
  initialName = "",
  initialDescription = "",
  initialFields = [],
  mode = "create",
}: {
  formId?: string;
  initialName?: string;
  initialDescription?: string;
  initialFields?: Parameters<typeof toDraft>[0];
  mode?: "create" | "edit";
}) {
  const action = mode === "create" ? createFmsForm : updateFmsForm;
  const [state, formAction, pending] = useActionState(action, fmsInitialState);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [fields, setFields] = useState(() => toDraft(initialFields));
  const [selectedId, setSelectedId] = useState<string | null>(
    () => toDraft(initialFields)[0]?.id ?? null,
  );
  const [addOpen, setAddOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const fieldsJsonRef = useRef<HTMLInputElement>(null);

  const validFields = fields.filter((field) => field.label.trim());
  const canSubmit = name.trim().length > 0 && validFields.length > 0;

  const currentAiDraft = useMemo((): ParsedFmsFormDraft => {
    return {
      name: name.trim() || "Untitled form",
      description: description.trim(),
      fields: validFields.map((field) => ({
        label: field.label.trim(),
        fieldType: field.fieldType,
        required: field.required,
        options: isEnumType(field.fieldType)
          ? parseOptionTags(field.options)
          : undefined,
        placeholder: field.placeholder.trim() || undefined,
        helpText: field.helpText.trim() || undefined,
      })),
    };
  }, [name, description, validFields]);

  function updateField(id: string, patch: Partial<FormFieldDraft>) {
    setFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    );
  }

  function addField(type: FmsFormFieldType) {
    const field = newField(type);
    setFields((prev) => [...prev, field]);
    setSelectedId(field.id);
  }

  function removeField(id: string) {
    setFields((prev) => {
      const next = prev.filter((field) => field.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
      }
      return next;
    });
  }

  function applyAiDraft(draft: ParsedFmsFormDraft) {
    const mapped = draftFromAi(draft);
    setName(mapped.name);
    setDescription(mapped.description);
    setFields(mapped.fields);
    setSelectedId(mapped.fields[0]?.id ?? null);
    setAiMessage("Form generated. Review fields before saving.");
  }

  async function handleAiGenerate() {
    const trimmed = aiPrompt.trim();
    const isRefine = validFields.length > 0;

    if (isRefine && trimmed.length < 4) {
      setAiMessage("Type a short refinement, e.g. add phone field.");
      return;
    }
    if (!isRefine && trimmed.length < 8) {
      setAiMessage("Add a few more words describing your form.");
      return;
    }

    setAiBusy(true);
    setAiMessage("");
    try {
      const result = await generateFmsFormFromAiAction(
        isRefine
          ? { description: trimmed, existingDraft: currentAiDraft }
          : { description: trimmed },
      );

      if (!result.ok) {
        setAiMessage(result.message);
        return;
      }

      applyAiDraft(result.draft);
      setAiPrompt("");
      setAiMessage(
        isRefine
          ? "Form updated. Review changes before saving."
          : "Form generated. Review fields before saving.",
      );
    } catch {
      setAiMessage(
        "Network error while generating form. Try again or add fields manually.",
      );
    } finally {
      setAiBusy(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (fieldsJsonRef.current) {
      fieldsJsonRef.current.value = fieldsJson;
    }
  }

  const fieldsJson = JSON.stringify(
    validFields.map((field) => ({
      label: field.label.trim(),
      fieldType: field.fieldType,
      required: field.required,
      options: isEnumType(field.fieldType)
        ? parseOptionTags(field.options)
        : [],
      placeholder: field.placeholder.trim() || undefined,
      helpText: field.helpText.trim() || undefined,
    })),
  );

  return (
    <form
      action={formAction}
      className="ws-fms-form-builder ws-fms-jotform"
      onSubmit={handleSubmit}
    >
      {formId ? <input type="hidden" name="formId" value={formId} /> : null}
      <input
        ref={fieldsJsonRef}
        type="hidden"
        name="fieldsJson"
        defaultValue={fieldsJson}
        readOnly
      />

      <div className="ws-fms-jf-ai-row">
        <SheetomaticAiMark sizes="md" className="ws-fms-jf-ai-icon" />
        <div className="ws-fms-jf-ai">
          <input
            type="text"
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder={
              fields.length === 0
                ? "Describe your form, e.g. trademark intake with applicant name and document upload"
                : "Refine with AI, e.g. add phone field or make all required"
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleAiGenerate();
              }
            }}
          />
          <button
            type="button"
            className="ws-fms-jf-ai-btn"
            disabled={aiBusy}
            onClick={() => void handleAiGenerate()}
          >
            {aiBusy ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
      {aiMessage ? (
        <p
          className={
            isAiErrorMessage(aiMessage)
              ? "ws-fms-jf-ai-message saas-form-message error"
              : "ws-fms-jf-ai-message saas-form-message ok"
          }
          role="status"
        >
          {aiMessage}
        </p>
      ) : null}

      <div className="ws-fms-jf-canvas">
        <header className="ws-fms-jf-header">
          <label className="ws-fms-jf-title-wrap">
            <span className="sr-only">Form name</span>
            <input
              name="name"
              required
              className="ws-fms-jf-title"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Form"
            />
          </label>
          <label className="ws-fms-jf-desc-wrap">
            <span className="sr-only">Description</span>
            <input
              name="description"
              className="ws-fms-jf-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description"
            />
          </label>
        </header>

        <div className="ws-fms-jf-divider" aria-hidden />

        <div className="ws-fms-jf-fields">
          {fields.length === 0 ? (
            <p className="ws-fms-jf-empty">
              Add fields below or describe your form with AI above.
            </p>
          ) : (
            fields.map((field) => (
              <EditorField
                key={field.id}
                field={field}
                expanded={field.id === selectedId}
                onToggle={() =>
                  setSelectedId((prev) =>
                    prev === field.id ? null : field.id,
                  )
                }
                onUpdate={(patch) => updateField(field.id, patch)}
                onRemove={() => removeField(field.id)}
              />
            ))
          )}
        </div>

        <div className="ws-fms-jf-add-wrap">
          <button
            type="button"
            className="ws-fms-jf-add"
            data-fms-add-trigger
            onClick={() => setAddOpen((open) => !open)}
          >
            <Plus size={14} aria-hidden />
            Add field
          </button>
          <FmsFieldTypePopover
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onAddField={addField}
          />
        </div>
      </div>

      {state.message ? (
        <p
          className={
            state.ok ? "saas-form-message ok" : "saas-form-message error"
          }
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <div className="form-actions ws-fms-jf-actions">
        {!canSubmit && validFields.length > 0 && !name.trim() ? (
          <p className="ws-fms-jf-save-hint">Enter a form name to save.</p>
        ) : null}
        {mode === "edit" ? (
          <button
            type="submit"
            name="publish"
            value="1"
            className="btn-secondary"
            disabled={pending || !canSubmit}
          >
            Save & publish
          </button>
        ) : null}
        <button
          type="submit"
          className="btn-cta btn-primary"
          disabled={pending || !canSubmit}
        >
          {pending
            ? "Saving..."
            : mode === "create"
              ? "Create form"
              : "Save form"}
        </button>
      </div>
    </form>
  );
}
