"use client";

import { useState } from "react";
import { FileCheck2, Send } from "lucide-react";
import {
  WhatsAppSettingsPanel,
  WhatsAppSettingsTrigger,
} from "@/components/saas/whatsapp-settings-panel";
import { WhatsAppGoLivePanel } from "@/components/saas/whatsapp-go-live-panel";
import { WhatsAppTemplateSubmitForm } from "@/components/saas/whatsapp-template-submit-form";
import { WhatsAppTemplatesList } from "@/components/saas/whatsapp-templates-list";
import type { WhatsAppTemplateRow } from "@/lib/whatsapp-template-types";
import type { WhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";
import type { WhatsAppSettingsFormValues } from "@/lib/whatsapp-settings-form";

type Tab = "submit" | "approved";

export function WhatsAppMessagingPanel({
  templates,
  canSend,
  canManageTemplates,
  setupHint,
  settingsInitialValues,
  credentialsReady,
  hasSavedSecrets,
  goLiveStatus,
}: {
  templates: WhatsAppTemplateRow[];
  canSend: boolean;
  canManageTemplates: boolean;
  setupHint: string | null;
  settingsInitialValues: WhatsAppSettingsFormValues;
  credentialsReady: boolean;
  hasSavedSecrets: {
    redlavaApiKey: boolean;
    masPassword: boolean;
    masApiKey: boolean;
  };
  goLiveStatus: WhatsAppGoLiveStatus;
}) {
  const [tab, setTab] = useState<Tab>("submit");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const approvedCount = templates.filter(
    (template) => template.status === "APPROVED",
  ).length;

  return (
    <div className="ws-wa-page">
      <WhatsAppGoLivePanel status={goLiveStatus} />

      <div className="ws-wa-toolbar">
        <div className="ws-wa-tabs" role="tablist" aria-label="WhatsApp messaging">
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

        <WhatsAppSettingsTrigger
          open={settingsOpen}
          onToggle={() => setSettingsOpen((value) => !value)}
        />
      </div>

      {settingsOpen ? (
        <WhatsAppSettingsPanel
          credentialsReady={credentialsReady}
          hasSavedSecrets={hasSavedSecrets}
          initialValues={settingsInitialValues}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      {setupHint ? (
        <div className="saas-form-message error ws-wa-config-banner">{setupHint}</div>
      ) : null}

      {tab === "submit" ? (
        <section className="saas-panel ws-wa-panel">
          <div className="ws-wa-panel-head">
            <h2>Submit template for approval</h2>
            <p>
              Create a WhatsApp template with variables and category for Meta
              approval — usually within minutes to 24 hours.
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
