"use client";

import { useState } from "react";
import { FileCheck2, Send } from "lucide-react";
import { WhatsAppTemplateSubmitForm } from "@/components/saas/whatsapp-template-submit-form";
import { WhatsAppTemplatesList } from "@/components/saas/whatsapp-templates-list";
import type { WhatsAppTemplateRow } from "@/lib/whatsapp-template-types";

type Tab = "submit" | "approved";

export function WhatsAppTemplatesPanel({
  templates,
  canManageTemplates,
  setupHint,
}: {
  templates: WhatsAppTemplateRow[];
  canManageTemplates: boolean;
  setupHint: string | null;
}) {
  const [tab, setTab] = useState<Tab>("submit");
  const approvedCount = templates.filter(
    (template) => template.status === "APPROVED",
  ).length;

  return (
    <div className="ws-wa-page">
      <div className="ws-wa-toolbar">
        <div className="ws-wa-tabs" role="tablist" aria-label="WhatsApp templates">
          <button
            aria-selected={tab === "submit"}
            className={`ws-wa-tab${tab === "submit" ? " is-active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setTab("submit")}
          >
            <Send size={16} aria-hidden />
            Get approval
          </button>
          <button
            aria-selected={tab === "approved"}
            className={`ws-wa-tab${tab === "approved" ? " is-active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setTab("approved")}
          >
            <FileCheck2 size={16} aria-hidden />
            Approved templates
            <span className="ws-wa-tab-count">{approvedCount}</span>
          </button>
        </div>
      </div>

      {setupHint ? (
        <div className="saas-form-message error ws-wa-config-banner">{setupHint}</div>
      ) : null}

      {tab === "submit" ? (
        <section className="saas-panel ws-wa-panel">
          <div className="ws-wa-panel-head">
            <h2>Submit template for approval</h2>
            <p>
              Create a WhatsApp template with variables and category. RedLava submits
              it for WhatsApp approval.
            </p>
          </div>
          <WhatsAppTemplateSubmitForm disabled={!canManageTemplates} />
        </section>
      ) : (
        <WhatsAppTemplatesList
          canManageTemplates={canManageTemplates}
          showAll={false}
          templates={templates}
        />
      )}
    </div>
  );
}
