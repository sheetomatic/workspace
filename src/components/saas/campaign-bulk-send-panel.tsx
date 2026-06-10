"use client";

import {
  buildTemplatePreviewText,
  extractTemplateCsvColumns,
  type RedlavaSendTemplateDetail,
  type RedlavaSendTemplateOption,
} from "@/lib/integrations/redlava-bulk-send";
import {
  buildCampaignSampleCsv,
  downloadTextFile,
} from "@/lib/campaign-sample-csv";
import {
  loadBulkSendTemplateDetailAction,
  loadBulkSendTemplatesAction,
} from "@/app/ai/app/campaign/actions";
import { AiKnowledgeInstructionPanel } from "@/components/saas/ai-knowledge-instruction-panel";
import type { KnowledgeInstructionBlock } from "@/lib/ai-knowledge-instructions";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Download,
  Loader2,
  Upload,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

const BULK_SEND_INSTRUCTIONS: KnowledgeInstructionBlock = {
  title: "How to use CSV Upload?",
  summary:
    "Send a WhatsApp template to many contacts at once by uploading a CSV — same flow as RedLava Bulk Message.",
  steps: [
    "Enter a campaign name and select an approved template.",
    "Download the sample CSV — first column must be receiverNumber, then template variable columns.",
    "Fill your contacts in the CSV and upload it here.",
    "Optionally turn on Schedule to send at a specific date and time.",
    "Click Submit — the campaign is created in RedLava and appears in Campaign insights below.",
  ],
  tips: [
    "Use country code in phone numbers (e.g. +919876543210 or 919876543210).",
    "Duplicate numbers in the CSV use the last row only.",
    "Marketing templates need opt-in compliance — use UTILITY templates for operational alerts.",
  ],
};

type TabId = "csv" | "grid" | "filters" | "retarget";

const TABS: Array<{ id: TabId; label: string; enabled: boolean }> = [
  { id: "csv", label: "CSV Upload", enabled: true },
  { id: "grid", label: "Manual Grid", enabled: false },
  { id: "filters", label: "Contact Filters", enabled: false },
  { id: "retarget", label: "Re-Targeting", enabled: false },
];

function templateKey(template: RedlavaSendTemplateOption) {
  return `${template.name}:${template.language}`;
}

export function CampaignBulkSendPanel({ connected }: { connected: boolean }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabId>("csv");
  const [templates, setTemplates] = useState<RedlavaSendTemplateOption[]>([]);
  const [templateKeyValue, setTemplateKeyValue] = useState("");
  const [templateDetail, setTemplateDetail] = useState<RedlavaSendTemplateDetail | null>(
    null,
  );
  const [campaignName, setCampaignName] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedTemplate = useMemo(
    () => templates.find((item) => templateKey(item) === templateKeyValue) ?? null,
    [templates, templateKeyValue],
  );

  const variableColumns = useMemo(
    () => (templateDetail ? extractTemplateCsvColumns(templateDetail) : []),
    [templateDetail],
  );

  const previewText = useMemo(() => {
    if (!templateDetail) {
      return "";
    }
    return buildTemplatePreviewText(
      templateDetail,
      variableColumns.map((_, index) => `Sample Value ${index + 1}`),
    );
  }, [templateDetail, variableColumns]);

  const loadTemplates = useCallback(() => {
    startTransition(async () => {
      setLoadError(null);
      const result = await loadBulkSendTemplatesAction();
      if (!result.ok) {
        setLoadError(result.error ?? "Could not load templates.");
        return;
      }
      setTemplates(result.templates);
    });
  }, []);

  useEffect(() => {
    if (connected) {
      loadTemplates();
    }
  }, [connected, loadTemplates]);

  useEffect(() => {
    if (!selectedTemplate) {
      setTemplateDetail(null);
      return;
    }

    startTransition(async () => {
      setLoadError(null);
      const result = await loadBulkSendTemplateDetailAction({
        name: selectedTemplate.name,
        language: selectedTemplate.language,
      });
      if (!result.ok) {
        setTemplateDetail(null);
        setLoadError(result.error);
        return;
      }
      setTemplateDetail(result.detail);
    });
  }, [selectedTemplate?.name, selectedTemplate?.language]);

  function downloadSampleCsv() {
    if (!templateDetail) {
      return;
    }
    const csv = buildCampaignSampleCsv(variableColumns);
    downloadTextFile(csv, "sample_contacts.csv");
  }

  function onCsvSelected(file: File | null) {
    setCsvFile(file);
    setSubmitError(null);
    setSuccessMessage(null);
  }

  function submitCampaign() {
    if (!selectedTemplate || !templateDetail) {
      setSubmitError("Select a template first.");
      return;
    }
    if (!campaignName.trim()) {
      setSubmitError("Enter a campaign name.");
      return;
    }
    if (!csvFile) {
      setSubmitError("Upload a CSV file before submitting.");
      return;
    }
    if (scheduleEnabled && !scheduleAt) {
      setSubmitError("Pick a schedule date and time.");
      return;
    }

    startTransition(async () => {
      setSubmitError(null);
      setSuccessMessage(null);

      const payload: Record<string, unknown> = {
        campaignType: "CSV",
        campaignName: campaignName.trim(),
        message: {
          templateName: selectedTemplate.name,
          language: selectedTemplate.language,
        },
      };

      if (scheduleEnabled && scheduleAt) {
        payload.schedule = {
          exactDateTime: new Date(scheduleAt).getTime(),
          cronExpression: null,
          delayInMinutes: null,
        };
      }

      const form = new FormData();
      form.append("jsonData", JSON.stringify(payload));
      form.append("csvFile", csvFile);

      const response = await fetch("/api/ai/campaign/bulk-send", {
        method: "POST",
        body: form,
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        campaignName?: string;
      };

      if (!response.ok) {
        setSubmitError(body.error ?? "Could not submit campaign.");
        return;
      }

      setSuccessMessage(
        `${body.campaignName ?? campaignName} — campaign created successfully.`,
      );
      setCampaignName("");
      setCsvFile(null);
      setScheduleEnabled(false);
      setScheduleAt("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    });
  }

  if (!connected) {
    return (
      <section className="ai-campaign-bulk-send">
        <header className="ai-campaign-bulk-send-head">
          <h2>Send bulk messages</h2>
          <p>Connect RedLava in Settings to create CSV campaigns from Sheetomatic.</p>
        </header>
      </section>
    );
  }

  return (
    <section className="ai-campaign-bulk-send">
      <header className="ai-campaign-bulk-send-head">
        <h2>Send bulk messages</h2>
        <p>Create WhatsApp CSV campaigns with template, upload, and optional schedule.</p>
      </header>

      <div className="ai-campaign-bulk-tabs" role="tablist" aria-label="Bulk send methods">
        {TABS.map((item) => (
          <button
            key={item.id}
            aria-selected={tab === item.id}
            className={`ai-campaign-bulk-tab${tab === item.id ? " is-active" : ""}${!item.enabled ? " is-disabled" : ""}`}
            disabled={!item.enabled}
            role="tab"
            type="button"
            onClick={() => item.enabled && setTab(item.id)}
          >
            {item.label}
            {!item.enabled ? <span className="ai-campaign-bulk-soon">Soon</span> : null}
          </button>
        ))}
      </div>

      {tab === "csv" ? (
        <div className="ai-campaign-bulk-layout">
          <div className="ai-campaign-bulk-form">
            <AiKnowledgeInstructionPanel
              block={BULK_SEND_INSTRUCTIONS}
              compact
              defaultOpen={false}
            />

            {loadError ? <p className="saas-form-message error">{loadError}</p> : null}
            {submitError ? <p className="saas-form-message error">{submitError}</p> : null}
            {successMessage ? (
              <p className="saas-form-message success">{successMessage}</p>
            ) : null}

            <label className="ai-campaign-bulk-field">
              <span>
                Campaign name <strong>*</strong>
              </span>
              <input
                placeholder="Campaign Name"
                type="text"
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
              />
            </label>

            <label className="ai-campaign-bulk-field">
              <span>
                Select template <strong>*</strong>
              </span>
              <div className="ai-campaign-bulk-select-wrap">
                <select
                  disabled={pending && templates.length === 0}
                  value={templateKeyValue}
                  onChange={(event) => setTemplateKeyValue(event.target.value)}
                >
                  <option value="">Select a template</option>
                  {templates.map((template) => (
                    <option key={templateKey(template)} value={templateKey(template)}>
                      {template.name} ({template.language}
                      {template.category ? ` · ${template.category}` : ""})
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden size={16} />
              </div>
            </label>

            <div className="ai-campaign-bulk-csv-actions">
              <button
                className="ai-campaign-bulk-secondary-btn"
                disabled={!templateDetail || pending}
                type="button"
                onClick={downloadSampleCsv}
              >
                <Download aria-hidden size={16} />
                Download Sample CSV
              </button>
              <button
                className="ai-campaign-bulk-secondary-btn"
                disabled={!templateDetail || pending}
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload aria-hidden size={16} />
                {csvFile ? "Change CSV" : "Upload CSV"}
              </button>
              <input
                ref={fileInputRef}
                accept=".csv,text/csv"
                className="sr-only"
                type="file"
                onChange={(event) => onCsvSelected(event.target.files?.[0] ?? null)}
              />
            </div>

            {csvFile ? (
              <p className="ai-campaign-bulk-file-name">
                Uploaded: <strong>{csvFile.name}</strong>
              </p>
            ) : null}

            {variableColumns.length > 0 ? (
              <p className="ai-campaign-bulk-columns">
                CSV columns: <code>receiverNumber</code>
                {variableColumns.map((column) => (
                  <code key={column}>, {column}</code>
                ))}
              </p>
            ) : null}

            <label className="ai-campaign-bulk-toggle">
              <input
                checked={scheduleEnabled}
                type="checkbox"
                onChange={(event) => setScheduleEnabled(event.target.checked)}
              />
              <span>Schedule</span>
            </label>

            {scheduleEnabled ? (
              <label className="ai-campaign-bulk-field">
                <span>Send at</span>
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(event) => setScheduleAt(event.target.value)}
                />
              </label>
            ) : null}

            <div className="ai-campaign-bulk-submit-wrap">
              <button
                className="ai-campaign-bulk-submit-btn"
                disabled={pending || !csvFile || !templateDetail || !campaignName.trim()}
                type="button"
                onClick={submitCampaign}
              >
                {pending ? (
                  <>
                    <Loader2 aria-hidden className="spin" size={16} />
                    Submitting…
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </div>

          <aside className="ai-campaign-bulk-preview">
            <h3>Preview</h3>
            <div className="ai-campaign-bulk-preview-phone">
              <p className="ai-campaign-bulk-preview-date">Today</p>
              <div className="ai-campaign-bulk-preview-bubble">
                {previewText ? (
                  <pre>{previewText}</pre>
                ) : (
                  <p className="ai-campaign-bulk-preview-empty">
                    Select a template to preview the message.
                  </p>
                )}
              </div>
              <p className="ai-campaign-bulk-preview-time">
                {new Date().toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
