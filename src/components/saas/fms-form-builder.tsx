"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Settings2, Trash2 } from "lucide-react";
import { FmsFormAiBar } from "@/components/saas/fms-form-ai-bar";
import { FmsFieldSettingsPanel } from "@/components/saas/fms-field-settings-panel";
import type { FmsFormFieldType } from "@prisma/client";
import {
  createFmsForm,
  updateFmsForm,
} from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";
import { FmsFieldTypePopover } from "@/components/saas/fms-form-add-modal";
import { FMS_FIELD_TYPE_LABELS, DEFAULT_PO_LINE_ITEM_COLUMNS, defaultFieldWidth, isHalfWidthFieldType, parseFieldOptions, type FmsFieldWidth, type FmsTableColumn } from "@/lib/fms/constants";
import { countMeaningfulFormFields } from "@/lib/fms/form-ai";
import type { ParsedFmsFormDraft } from "@/lib/integrations/openai";

export type FormFieldDraft = {
  id: string;
  label: string;
  fieldType: FmsFormFieldType;
  required: boolean;
  options: string;
  placeholder: string;
  helpText: string;
  width: FmsFieldWidth;
  dependsOnEnabled: boolean;
  dependsOn: string;
  choicesByParentText: string;
  tableColumns: FmsTableColumn[];
};

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
  TABLE: "Line items",
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
    width: defaultFieldWidth(type),
    dependsOnEnabled: false,
    dependsOn: "",
    choicesByParentText: "",
    tableColumns:
      type === "TABLE"
        ? DEFAULT_PO_LINE_ITEM_COLUMNS.map((column) => ({ ...column }))
        : [],
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
  return fields.map((field) => {
    const parsed = parseFieldOptions(field.options);
    const choicesByParentText = parsed.choicesByParent
      ? Object.entries(parsed.choicesByParent)
          .flatMap(([parent, children]) =>
            children.map((child) => `${parent},${child}`),
          )
          .join("\n")
      : "";
    return {
      id: crypto.randomUUID(),
      label: field.label,
      fieldType: field.fieldType,
      required: field.required,
      options: parsed.choices.join("\n"),
      placeholder: field.placeholder ?? "",
      helpText: field.helpText ?? "",
      width: isHalfWidthFieldType(field.fieldType) ? parsed.width : "full",
      dependsOnEnabled: Boolean(parsed.dependsOn && parsed.choicesByParent),
      dependsOn: parsed.dependsOn ?? "",
      choicesByParentText,
      tableColumns: field.fieldType === "TABLE"
        ? (parsed.columns?.length
            ? parsed.columns.map((column) => ({ ...column }))
            : DEFAULT_PO_LINE_ITEM_COLUMNS.map((column) => ({ ...column })))
        : [],
    };
  });
}

function draftFromAi(draft: ParsedFmsFormDraft): {
  name: string;
  description: string;
  fields: FormFieldDraft[];
} {
  return {
    name: draft.name,
    description: draft.description,
    fields: draft.fields.map((field) => {
      const choicesByParentText = field.choicesByParent
        ? Object.entries(field.choicesByParent)
            .flatMap(([parent, children]) =>
              children.map((child) => `${parent},${child}`),
            )
            .join("\n")
        : "";
      return {
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
        width: defaultFieldWidth(field.fieldType),
        dependsOnEnabled: Boolean(field.dependsOn && field.choicesByParent),
        dependsOn: field.dependsOn ?? "",
        choicesByParentText,
        tableColumns:
          field.fieldType === "TABLE"
            ? (field.columns?.length
                ? field.columns.map((column) => ({ ...column }))
                : DEFAULT_PO_LINE_ITEM_COLUMNS.map((column) => ({ ...column })))
            : [],
      };
    }),
  };
}

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

function parseDependentMatrix(text: string) {
  const choicesByParent: Record<string, string[]> = {};
  const parentSet = new Set<string>();

  for (const line of parseLinesFromUpload(text)) {
    const parts = line.split(",").map((part) => part.trim());
    if (parts.length < 2) {
      continue;
    }
    const parent = parts[0];
    const child = parts.slice(1).join(",").trim();
    if (!parent || !child) {
      continue;
    }
    parentSet.add(parent);
    if (!choicesByParent[parent]) {
      choicesByParent[parent] = [];
    }
    if (!choicesByParent[parent].includes(child)) {
      choicesByParent[parent].push(child);
    }
  }

  return {
    parentOptions: [...parentSet],
    choicesByParent,
  };
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

      {field.fieldType === "TABLE" ? (
        <span className="ws-fms-jf-table-preview">
          <span className="ws-fms-jf-table-preview-head">
            {(field.tableColumns.length
              ? field.tableColumns
              : DEFAULT_PO_LINE_ITEM_COLUMNS
            )
              .slice(0, 4)
              .map((column) => column.label)
              .join(" · ")}
          </span>
          <span className="ws-fms-jf-stub ws-fms-jf-stub-muted">
            Repeatable rows — add/remove on submit
          </span>
        </span>
      ) : null}
    </div>
  );
}

function EditorField({
  field,
  selected,
  canMoveUp,
  canMoveDown,
  onSelect,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  field: FormFieldDraft;
  selected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<FormFieldDraft>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const canSetWidth = isHalfWidthFieldType(field.fieldType);
  const isFullWidth = !canSetWidth || field.width === "full";

  return (
    <div
      className={`ws-fms-jf-field${selected ? " is-selected" : ""}${isFullWidth ? " is-full-width" : " is-half-width"}`}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button, input, select, textarea, label, a")) {
          return;
        }
        onSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          const target = event.target as HTMLElement;
          if (target.closest("button, input, select, textarea, label, a")) {
            return;
          }
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="ws-fms-jf-field-row">
        <div className="ws-fms-jf-field-main">
          <input
            className="ws-fms-jf-field-label"
            value={field.label}
            onChange={(event) => onUpdate({ label: event.target.value })}
            placeholder="Field label"
            aria-label="Field label"
          />
          {field.required ? <span className="ws-fms-jf-req">*</span> : null}
          <span className="ws-fms-jf-field-type-pill">
            {FMS_FIELD_TYPE_LABELS[field.fieldType]}
          </span>
          <FieldPreviewStub field={field} editorMode />
        </div>
        <div className="ws-fms-jf-field-actions">
          <button
            type="button"
            className="ws-fms-jf-gear ws-fms-jf-move"
            aria-label="Move question up"
            title="Move up"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            <ChevronUp size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="ws-fms-jf-gear ws-fms-jf-move"
            aria-label="Move question down"
            title="Move down"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            <ChevronDown size={16} aria-hidden />
          </button>
          <button
            type="button"
            className={`ws-fms-jf-gear${selected ? " is-active" : ""}`}
            aria-label="Field settings"
            onClick={onSelect}
          >
            <Settings2 size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="ws-fms-jf-gear ws-fms-jf-trash"
            aria-label="Remove field"
            title="Remove field"
            onClick={onRemove}
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

export function FmsFormBuilder({
  formId,
  initialName = "",
  initialDescription = "",
  initialFields = [],
  workflowHint = "",
  mode = "create",
}: {
  formId?: string;
  initialName?: string;
  initialDescription?: string;
  initialFields?: Parameters<typeof toDraft>[0];
  workflowHint?: string;
  mode?: "create" | "edit";
}) {
  const action = mode === "create" ? createFmsForm : updateFmsForm;
  const [state, formAction, pending] = useActionState(action, fmsInitialState);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [fields, setFields] = useState(() => toDraft(initialFields));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
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
        options: isEnumType(field.fieldType) && !field.dependsOnEnabled
          ? parseOptionTags(field.options)
          : undefined,
        columns:
          field.fieldType === "TABLE" ? field.tableColumns : undefined,
        dependsOn:
          field.dependsOnEnabled && field.dependsOn.trim()
            ? field.dependsOn.trim()
            : undefined,
        choicesByParent:
          field.dependsOnEnabled && field.dependsOn.trim()
            ? parseDependentMatrix(field.choicesByParentText).choicesByParent
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

  function moveField(id: string, direction: "up" | "down") {
    setFields((prev) => {
      const index = prev.findIndex((field) => field.id === id);
      if (index < 0) {
        return prev;
      }
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function applyAiDraft(draft: ParsedFmsFormDraft) {
    if (countMeaningfulFormFields(draft) === 0) {
      return;
    }
    const mapped = draftFromAi(draft);
    setName(mapped.name);
    setDescription(mapped.description);
    setFields(mapped.fields);
    setSelectedId(mapped.fields[0]?.id ?? null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (fieldsJsonRef.current) {
      fieldsJsonRef.current.value = fieldsJson;
    }
  }

  const fieldsJson = JSON.stringify(
    validFields.map((field) => {
      const base = {
        label: field.label.trim(),
        fieldType: field.fieldType,
        required: field.required,
        placeholder: field.placeholder.trim() || undefined,
        helpText: field.helpText.trim() || undefined,
        width: isHalfWidthFieldType(field.fieldType) ? field.width : "full",
      };

      if (!isEnumType(field.fieldType)) {
        if (field.fieldType === "TABLE") {
          return {
            ...base,
            columns: field.tableColumns.length
              ? field.tableColumns
              : DEFAULT_PO_LINE_ITEM_COLUMNS,
          };
        }
        return { ...base, options: [] };
      }

      if (field.dependsOnEnabled && field.dependsOn.trim()) {
        const { choicesByParent } = parseDependentMatrix(
          field.choicesByParentText,
        );
        return {
          ...base,
          dependsOn: field.dependsOn.trim(),
          choicesByParent,
          options: [],
        };
      }

      return {
        ...base,
        options: parseOptionTags(field.options),
      };
    }),
  );

  const selectedField = fields.find((field) => field.id === selectedId) ?? null;

  return (
    <div className="ws-fms-form-builder">
      <FmsFormAiBar
        formName={name}
        formDescription={description}
        workflowHint={workflowHint}
        existingDraft={currentAiDraft}
        onReady={applyAiDraft}
        compact={fields.length > 0}
      />

      <form
        action={formAction}
        className="ws-fms-form-builder-form ws-fms-jotform ws-fms-jf-scroll-shell"
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

      <div className="ws-fms-jf-canvas">
        <header className="ws-fms-jf-header ws-fms-jf-sticky-header">
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

        <div className="ws-fms-jf-builder-split">
          <div className="ws-fms-jf-fields-scroll">
            <div className="ws-fms-jf-fields ws-fms-jf-fields-grid">
              {fields.length === 0 ? (
                <div className="ws-fms-jf-empty ws-fms-jf-empty-full">
                  <p>No fields yet.</p>
                  <p className="ws-fms-muted">
                    Tap <strong>Build form with AI</strong> above — voice or text works.
                  </p>
                </div>
              ) : (
                fields.map((field, index) => (
                  <EditorField
                    key={field.id}
                    field={field}
                    selected={field.id === selectedId}
                    canMoveUp={index > 0}
                    canMoveDown={index < fields.length - 1}
                    onSelect={() =>
                      setSelectedId((prev) =>
                        prev === field.id ? null : field.id,
                      )
                    }
                    onUpdate={(patch) => updateField(field.id, patch)}
                    onMoveUp={() => moveField(field.id, "up")}
                    onMoveDown={() => moveField(field.id, "down")}
                    onRemove={() => removeField(field.id)}
                  />
                ))
              )}
            </div>
          </div>

          {selectedField ? (
            <FmsFieldSettingsPanel
              field={selectedField}
              allFields={fields}
              onUpdate={(patch) => updateField(selectedField.id, patch)}
              onRemove={() => removeField(selectedField.id)}
              onClose={() => setSelectedId(null)}
            />
          ) : null}
        </div>

        <div className="ws-fms-jf-add-wrap ws-fms-jf-canvas-footer">
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

      <div className="form-actions ws-fms-jf-actions ws-fms-jf-sticky-actions">
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
    </div>
  );
}
