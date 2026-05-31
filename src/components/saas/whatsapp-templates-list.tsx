"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import {
  importApprovedWhatsAppTemplates,
  syncWhatsAppTemplates,
} from "@/app/app/whatsapp/actions";
import type { WhatsAppTemplateRow } from "@/lib/whatsapp-template-types";
import {
  WHATSAPP_TEMPLATE_CATEGORY_LABELS,
  WHATSAPP_TEMPLATE_STATUS_LABELS,
  previewTemplateBody,
} from "@/lib/whatsapp-templates";

export function WhatsAppTemplatesList({
  templates,
  showAll,
  canManageTemplates,
}: {
  templates: WhatsAppTemplateRow[];
  showAll: boolean;
  canManageTemplates: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  function runSync() {
    startTransition(async () => {
      const result = await syncWhatsAppTemplates();
      setMessage(result);
    });
  }

  function runImport() {
    startTransition(async () => {
      const result = await importApprovedWhatsAppTemplates();
      setMessage(result);
    });
  }

  const visible = showAll
    ? templates
    : templates.filter((template) => template.status === "APPROVED");

  return (
    <section className="ws-wa-templates-section">
      <div className="ws-wa-templates-toolbar">
        <div>
          <h2>{showAll ? "All templates" : "Approved templates"}</h2>
          <p>
            {visible.length} template{visible.length === 1 ? "" : "s"} in this
            view
          </p>
        </div>
        <div className="ws-wa-templates-actions">
          <button
            className="btn-cta btn-secondary"
            disabled={pending || !canManageTemplates}
            type="button"
            onClick={runSync}
          >
            <RefreshCw size={16} aria-hidden />
            Sync from RedLava
          </button>
          <button
            className="btn-cta btn-ghost"
            disabled={pending || !canManageTemplates}
            type="button"
            onClick={runImport}
          >
            Import approved
          </button>
        </div>
      </div>

      {message ? (
        <p className={`saas-form-message ${message.ok ? "ok" : "error"}`}>
          {message.message}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="ws-empty-state ws-wa-empty">
          <strong>No templates yet</strong>
          <p>
            Submit a template or click <strong>Sync from RedLava</strong> to pull
            templates from your RedLava account.
          </p>
        </div>
      ) : (
        <ul className="ws-wa-template-list">
          {visible.map((template) => {
            const variables = Array.isArray(template.variables)
              ? (template.variables as Array<{ name: string; example: string }>)
              : [];
            const preview = previewTemplateBody(template.body, variables);

            return (
              <li className="ws-wa-template-card" key={template.id}>
                <div className="ws-wa-template-card-head">
                  <div>
                    <div className="ws-wa-template-chip-row">
                      <span className="ws-wa-template-name">{template.name}</span>
                      <span
                        className={`ws-wa-template-status status-${template.status.toLowerCase()}`}
                      >
                        {WHATSAPP_TEMPLATE_STATUS_LABELS[template.status]}
                      </span>
                      <span className="ws-wa-template-category">
                        {WHATSAPP_TEMPLATE_CATEGORY_LABELS[template.category]}
                      </span>
                      <span className="ws-wa-template-language">
                        {template.language}
                      </span>
                    </div>
                    <p className="ws-wa-template-preview">{preview}</p>
                  </div>
                </div>

                {variables.length > 0 ? (
                  <div className="ws-wa-template-vars">
                    {variables.map((variable) => (
                      <span className="ws-wa-template-var" key={variable.name}>
                        {"{{"}
                        {variable.name}
                        {"}}"} = {variable.example}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="ws-wa-template-meta">
                  <span>
                    Submitted{" "}
                    {new Date(template.submittedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {template.approvedAt ? (
                    <span>
                      Approved{" "}
                      {new Date(template.approvedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  ) : null}
                  <span>
                    By {template.createdBy.name ?? template.createdBy.email}
                  </span>
                </div>

                {template.rejectionReason ? (
                  <p className="ws-wa-template-rejection">
                    Rejection reason: {template.rejectionReason}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
