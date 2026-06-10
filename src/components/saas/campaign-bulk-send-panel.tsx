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
import Link from "next/link";
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
    "Send a WhatsApp template to many contacts at once by uploading a CSV  -  same flow as RedLava Bulk Message.",
  steps: [
    "Enter a campaign name and select an approved template.",
    "Download the sample CSV  -  first column must be receiverNumber, then template variable columns.",
    "Fill your contacts in the CSV and upload it here.",
    "Optionally turn on Schedule to send at a specific date and time.",
    "Click Submit - the campaign is created in RedLava and appears in Campaign insights below.",
  ],
  tips: [
    "Use country code in phone numbers (e.g. +919876543210 or 919876543210).",
    "Duplicate numbers in the CSV use the last row only.",
    "Marketing templates need opt-in compliance  -  use UTILITY templates for operational alerts.",
  ],
};

type TabId = "csv" | "grid" | "filters" | "retarget";

const TABS: Array<{ id: TabId; label: string; enabled: boolean }> = [
  { id: "csv", label: "CSV Upload", enabled: true },
  { id: "grid", label: "Manual Grid", enabled: false },
  { id: "filters", label: "Contact Filters", enabled: false },
  { id: "retarget", label: "Re-Targeting", enabled: false },
];

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const secondaryBtnClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
const submitBtnClass =
  "inline-flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

function templateKey(template: RedlavaSendTemplateOption) {
  return `${template.name}:${template.language}`;
}

export function CampaignBulkSendPanel({
  connected,
  initialTemplates = [],
  templatesError: initialTemplatesError = null,
  setupHint = null,
}: {
  connected: boolean;
  initialTemplates?: RedlavaSendTemplateOption[];
  templatesError?: string | null;
  setupHint?: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabId>("csv");
  const [templates, setTemplates] = useState(initialTemplates);
  const [templatesError, setTemplatesError] = useState(initialTemplatesError);
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

  const formDisabled = !connected || pending;

  useEffect(() => {
    setTemplates(initialTemplates);
    setTemplatesError(initialTemplatesError);
  }, [initialTemplates, initialTemplatesError]);

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

  const refreshTemplates = useCallback(() => {
    if (!connected) {
      return;
    }
    startTransition(async () => {
      setTemplatesError(null);
      const result = await loadBulkSendTemplatesAction();
      if (!result.ok) {
        setTemplates([]);
        setTemplatesError(result.error ?? "Could not load templates.");
        return;
      }
      setTemplates(result.templates);
      if (result.templates.length === 0) {
        setTemplatesError(
          "No sendable templates found. Sync approved templates in Templates.",
        );
      }
    });
  }, [connected]);

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
    if (!connected) {
      setSubmitError("Connect RedLava in Settings before submitting.");
      return;
    }
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
        `${body.campaignName ?? campaignName} - campaign created successfully.`,
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

  return (
    <section className="ai-campaign-bulk-send">
      <header className="ai-campaign-bulk-send-head">
        <h2>Send bulk messages</h2>
        <p>Create WhatsApp CSV campaigns with template, upload, and optional schedule.</p>
      </header>

      {!connected && setupHint ? (
        <div className="saas-form-message error">
          {setupHint}{" "}
          <Link className="underline" href="/ai/app/settings">
            Open Settings
          </Link>
        </div>
      ) : null}

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

            {templatesError ? (
              <p className="saas-form-message error">
                {templatesError}{" "}
                <button
                  className="underline"
                  disabled={!connected || pending}
                  type="button"
                  onClick={refreshTemplates}
                >
                  Retry
                </button>
                {" · "}
                <Link className="underline" href="/ai/app/templates">
                  Templates
                </Link>
              </p>
            ) : null}
            {loadError ? <p className="saas-form-message error">{loadError}</p> : null}
            {submitError ? <p className="saas-form-message error">{submitError}</p> : null}
            {successMessage ? (
              <p className="saas-form-message success">{successMessage}</p>
            ) : null}

            <label className="ai-campaign-bulk-field">
              <span className="text-sm font-semibold text-slate-700">
                Campaign name <span className="text-red-600">*</span>
              </span>
              <input
                className={fieldClass}
                disabled={formDisabled}
                placeholder="Campaign Name"
                type="text"
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
              />
            </label>

            <label className="ai-campaign-bulk-field">
              <span className="text-sm font-semibold text-slate-700">
                Select template <span className="text-red-600">*</span>
              </span>
              <div className="relative">
                <select
                  className={`${fieldClass} appearance-none pr-9`}
                  disabled={formDisabled}
                  value={templateKeyValue}
                  onChange={(event) => setTemplateKeyValue(event.target.value)}
                >
                  <option value="">
                    {templates.length === 0
                      ? "No templates available"
                      : "Select a template"}
                  </option>
                  {templates.map((template) => (
                    <option key={templateKey(template)} value={templateKey(template)}>
                      {template.name} ({template.language}
                      {template.category ? ` · ${template.category}` : ""})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
              </div>
              {connected && templates.length === 0 && !templatesError ? (
                <p className="mt-1 text-xs text-slate-500">
                  Loading templates from RedLava…
                </p>
              ) : null}
            </label>

            <div className="flex flex-wrap gap-2.5">
              <button
                className={secondaryBtnClass}
                disabled={formDisabled || !templateDetail}
                type="button"
                onClick={downloadSampleCsv}
              >
                <Download aria-hidden size={16} />
                Download Sample CSV
              </button>
              <button
                className={secondaryBtnClass}
                disabled={formDisabled || !templateDetail}
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
                disabled={formDisabled}
                type="file"
                onChange={(event) => onCsvSelected(event.target.files?.[0] ?? null)}
              />
            </div>

            {csvFile ? (
              <p className="text-sm text-slate-600">
                Uploaded: <strong>{csvFile.name}</strong>
              </p>
            ) : null}

            {variableColumns.length > 0 ? (
              <p className="text-sm text-slate-600">
                CSV columns: <code className="text-blue-700">receiverNumber</code>
                {variableColumns.map((column) => (
                  <code className="text-blue-700" key={column}>
                    , {column}
                  </code>
                ))}
              </p>
            ) : null}

            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                checked={scheduleEnabled}
                disabled={formDisabled}
                type="checkbox"
                onChange={(event) => setScheduleEnabled(event.target.checked)}
              />
              Schedule
            </label>

            {scheduleEnabled ? (
              <label className="ai-campaign-bulk-field">
                <span className="text-sm font-semibold text-slate-700">Send at</span>
                <input
                  className={fieldClass}
                  disabled={formDisabled}
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(event) => setScheduleAt(event.target.value)}
                />
              </label>
            ) : null}

            <div className="flex justify-center pt-1">
              <button
                className={submitBtnClass}
                disabled={
                  formDisabled ||
                  !csvFile ||
                  !templateDetail ||
                  !campaignName.trim()
                }
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
