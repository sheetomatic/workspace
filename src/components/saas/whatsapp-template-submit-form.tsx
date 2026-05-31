"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  Braces,
  FileText,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { submitWhatsAppTemplate } from "@/app/app/whatsapp/actions";
import { whatsAppTemplateInitialState } from "@/lib/whatsapp-template-types";
import {
  WHATSAPP_TEMPLATE_CATEGORY_LABELS,
  extractTemplateVariables,
  normalizeTemplateName,
  previewTemplateBody,
  type WhatsAppTemplateVariable,
} from "@/lib/whatsapp-templates";

const defaultVariables: WhatsAppTemplateVariable[] = [
  { name: "customer_name", example: "Rahul Sharma" },
  { name: "company_name", example: "Sheetomatic Technologies" },
];

const QUICK_VARIABLES = [
  "customer_name",
  "company_name",
  "amount",
  "due_date",
  "order_id",
];

export function WhatsAppTemplateSubmitForm({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(
    submitWhatsAppTemplate,
    whatsAppTemplateInitialState,
  );
  const [name, setName] = useState("");
  const [category, setCategory] = useState("UTILITY");
  const [language, setLanguage] = useState("en");
  const [body, setBody] = useState(
    "Hello {{customer_name}}, your follow-up from {{company_name}} is scheduled.",
  );
  const [variables, setVariables] =
    useState<WhatsAppTemplateVariable[]>(defaultVariables);

  const referenced = useMemo(() => extractTemplateVariables(body), [body]);
  const normalizedName = normalizeTemplateName(name) || "payment_follow_up";
  const preview = useMemo(
    () => previewTemplateBody(body, variables),
    [body, variables],
  );

  const missingExamples = referenced.filter((variableName) => {
    const match = variables.find((item) => item.name === variableName);
    return !match?.example?.trim();
  });

  useEffect(() => {
    setVariables((current) => {
      const existing = new Map(current.map((item) => [item.name, item.example]));
      const synced = referenced.map((variableName) => ({
        name: variableName,
        example: existing.get(variableName) ?? "",
      }));

      const extras = current.filter((item) => !referenced.includes(item.name));
      return [...synced, ...extras];
    });
  }, [referenced.join("|")]);

  function updateVariable(
    index: number,
    field: keyof WhatsAppTemplateVariable,
    value: string,
  ) {
    setVariables((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addVariable() {
    const nextName = `variable_${variables.length + 1}`;
    setVariables((current) => [
      ...current,
      { name: nextName, example: "Sample value" },
    ]);
    insertVariableIntoBody(nextName);
  }

  function removeVariable(index: number) {
    setVariables((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function insertVariableIntoBody(variableName: string) {
    const token = `{{${variableName}}}`;
    setBody((current) => {
      if (current.includes(token)) {
        return current;
      }
      const spacer = current.trim().endsWith(".") ? " " : current.trim() ? " " : "";
      return `${current.trim()}${spacer}${token}`.trimStart();
    });
  }

  function syncVariablesFromBody() {
    const names = extractTemplateVariables(body);
    setVariables((current) => {
      const existing = new Map(current.map((item) => [item.name, item.example]));
      return names.map((variableName) => ({
        name: variableName,
        example: existing.get(variableName) ?? "",
      }));
    });
  }

  const displayedVariables =
    referenced.length > 0
      ? variables.filter((item) => referenced.includes(item.name))
      : variables;

  return (
    <form action={action} className="ws-wa-submit-form">
      <section className="ws-wa-form-section">
        <header className="ws-wa-form-section-head">
          <span className="ws-wa-form-section-icon" aria-hidden>
            <FileText size={18} />
          </span>
          <div>
            <h3>Template details</h3>
            <p>Name, category, and language for WhatsApp approval.</p>
          </div>
        </header>

        <div className="ws-wa-template-grid">
          <label className="ws-wa-field">
            <span className="ws-wa-field-label">Template name</span>
            <input
              className="ws-wa-input"
              name="name"
              placeholder="payment_follow_up"
              required
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <span className="ws-field-hint">
              Saved as <code>{normalizedName}</code>
            </span>
          </label>

          <label className="ws-wa-field">
            <span className="ws-wa-field-label">Category</span>
            <select
              className="ws-wa-input"
              name="category"
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {Object.entries(WHATSAPP_TEMPLATE_CATEGORY_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="ws-wa-field">
            <span className="ws-wa-field-label">Language</span>
            <select
              className="ws-wa-input"
              name="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="en">English (en)</option>
              <option value="en_US">English US (en_US)</option>
              <option value="hi">Hindi (hi)</option>
            </select>
          </label>
        </div>
      </section>

      <div className="ws-wa-compose-grid">
        <section className="ws-wa-form-section">
          <header className="ws-wa-form-section-head">
            <span className="ws-wa-form-section-icon" aria-hidden>
              <MessageSquare size={18} />
            </span>
            <div>
              <h3>Message body</h3>
              <p>
                Use {"{{variable_name}}"} placeholders. Click a chip below to
                insert.
              </p>
            </div>
          </header>

          <label className="ws-wa-field ws-wa-field-full">
            <textarea
              className="ws-wa-textarea"
              name="body"
              required
              rows={6}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onBlur={syncVariablesFromBody}
              placeholder="Hello {{customer_name}}, your payment of {{amount}} is due on {{due_date}}."
            />
            <span className="ws-field-hint">
              {body.length} characters  |  {referenced.length} variable
              {referenced.length === 1 ? "" : "s"} detected
            </span>
          </label>

          <div className="ws-wa-insert-vars">
            <span className="ws-wa-insert-vars-label">Insert variable</span>
            <div className="ws-wa-var-chips">
              {QUICK_VARIABLES.map((variableName) => (
                <button
                  key={variableName}
                  className={`ws-wa-var-chip${referenced.includes(variableName) ? " is-used" : ""}`}
                  type="button"
                  onClick={() => insertVariableIntoBody(variableName)}
                >
                  <Braces size={12} aria-hidden />
                  {variableName}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="ws-wa-preview-panel ws-wa-preview-bubble">
          <header className="ws-wa-preview-head">
            <h3>Live preview</h3>
            <span className="ws-wa-preview-badge">WhatsApp</span>
          </header>
          <div className="ws-wa-phone-mock">
            <div className="ws-wa-bubble">{preview || "Your message preview appears here."}</div>
          </div>
          {referenced.length > 0 ? (
            <ul className="ws-wa-preview-vars">
              {referenced.map((variableName) => {
                const example =
                  variables.find((item) => item.name === variableName)?.example ||
                  "";
                return (
                  <li key={variableName}>
                    <code>{`{{${variableName}}}`}</code>
                    <span>{example || "Add example value"}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      </div>

      <section className="ws-wa-variables-panel">
        <div className="ws-wa-variables-head">
          <div className="ws-wa-variables-title">
            <span className="ws-wa-form-section-icon" aria-hidden>
              <Braces size={18} />
            </span>
            <div>
              <h3>Variables</h3>
              <p>
                {referenced.length} placeholder
                {referenced.length === 1 ? "" : "s"} in the message body.
                {missingExamples.length > 0
                  ? ` ${missingExamples.length} need example values.`
                  : " All examples filled."}
              </p>
            </div>
          </div>
          <div className="ws-wa-variables-actions">
            <button
              className="btn-cta btn-ghost ws-wa-sync-btn"
              type="button"
              onClick={syncVariablesFromBody}
            >
              <RefreshCw size={15} aria-hidden />
              Sync from body
            </button>
            <button
              className="btn-cta btn-secondary"
              type="button"
              onClick={addVariable}
            >
              <Plus size={16} aria-hidden />
              Add variable
            </button>
          </div>
        </div>

        {displayedVariables.length === 0 ? (
          <div className="ws-wa-variables-empty">
            No variables yet. Add {"{{name}}"} placeholders in the message body or
            click <strong>Add variable</strong>.
          </div>
        ) : (
          <ul className="ws-wa-variables-list">
            {displayedVariables.map((variable, index) => {
              const globalIndex = variables.findIndex(
                (item) => item.name === variable.name,
              );
              const rowIndex = globalIndex >= 0 ? globalIndex : index;
              const isMissing = !variable.example.trim();

              return (
                <li
                  className={`ws-wa-variable-row${isMissing ? " is-missing" : ""}`}
                  key={`${variable.name}-${index}`}
                >
                  <div className="ws-wa-variable-index">{index + 1}</div>
                  <div className="ws-wa-variable-token">
                    <code>{`{{${variable.name}}}`}</code>
                  </div>
                  <label className="ws-wa-field ws-wa-variable-name-field">
                    <span className="ws-wa-field-label">Variable name</span>
                    <input
                      className="ws-wa-input"
                      name="variableName"
                      required
                      type="text"
                      value={variable.name}
                      onChange={(event) =>
                        updateVariable(rowIndex, "name", event.target.value)
                      }
                    />
                  </label>
                  <label className="ws-wa-field ws-wa-variable-example-field">
                    <span className="ws-wa-field-label">Example value</span>
                    <input
                      className="ws-wa-input"
                      name="variableExample"
                      placeholder="Sample value for approval"
                      required
                      type="text"
                      value={variable.example}
                      onChange={(event) =>
                        updateVariable(rowIndex, "example", event.target.value)
                      }
                    />
                  </label>
                  <button
                    aria-label={`Remove ${variable.name}`}
                    className="ws-wa-variable-remove"
                    type="button"
                    onClick={() => removeVariable(rowIndex)}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="ws-wa-submit-actions">
        <button
          className="btn-cta btn-primary"
          disabled={pending || disabled || missingExamples.length > 0}
          type="submit"
        >
          <Send size={16} aria-hidden />
          {pending ? "Submitting..." : "Submit for approval"}
        </button>
        {missingExamples.length > 0 ? (
          <p className="ws-wa-submit-note">
            Fill example values for{" "}
            {missingExamples.map((item) => `{{${item}}}`).join(", ")} before
            submitting.
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p className={`saas-form-message ${state.ok ? "ok" : "error"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
