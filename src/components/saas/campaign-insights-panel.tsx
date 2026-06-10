"use client";

import {
  CheckCircle2,
  ChevronDown,
  Download,
  Loader2,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  loadCampaignDetailsAction,
  loadCampaignInsightsAction,
  loadCampaignMessagesAction,
} from "@/app/ai/app/campaign/actions";
import {
  MESSAGE_STATUS_LABELS,
  UPLOAD_RESULT_LABELS,
  campaignScheduleLabel,
  formatRedlavaEpoch,
  type RedlavaCsvCampaign,
  type RedlavaCampaignDetailRow,
  type RedlavaMessageReportRow,
} from "@/lib/integrations/redlava-campaigns";

type Tab = "campaign" | "messages";

type InsightsPayload = {
  uploadResults: Record<string, number>;
  insight: {
    total: number;
    statuses: Array<{ status: string; count: number }>;
  };
};

function MetricCard({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: number;
  tone?: "primary" | "success" | "error" | "neutral" | "info";
  icon?: ReactNode;
}) {
  return (
    <article className={`ai-campaign-metric tone-${tone}`}>
      <p className="ai-campaign-metric-label">{label}</p>
      <p className="ai-campaign-metric-value">
        {icon}
        {value.toLocaleString("en-IN")}
      </p>
    </article>
  );
}

function resultTone(result: string) {
  if (result.includes("success")) {
    return "success";
  }
  if (result.includes("failed") || result.includes("error")) {
    return "error";
  }
  if (result.includes("duplicate")) {
    return "neutral";
  }
  return "neutral";
}

function formatResultLabel(result: string) {
  return (
    UPLOAD_RESULT_LABELS[result]?.label ??
    result.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function messageCustomerName(row: RedlavaMessageReportRow) {
  const param = row.message?.template?.components?.[0]?.parameters?.[0]?.text;
  return param?.trim() || "-";
}

function messagePhone(row: RedlavaMessageReportRow) {
  const to = row.message?.to ?? "";
  return to ? (to.startsWith("+") ? to : `+${to}`) : "-";
}

export function CampaignInsightsPanel({
  campaigns,
  connected,
  error,
}: {
  campaigns: RedlavaCsvCampaign[];
  connected: boolean;
  error?: string | null;
}) {
  const [selectedId, setSelectedId] = useState(campaigns[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("campaign");
  const [insights, setInsights] = useState<InsightsPayload | null>(null);
  const [detailRows, setDetailRows] = useState<RedlavaCampaignDetailRow[]>([]);
  const [messageRows, setMessageRows] = useState<RedlavaMessageReportRow[]>([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [messageTotal, setMessageTotal] = useState(0);
  const [detailPage, setDetailPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedId) ?? null,
    [campaigns, selectedId],
  );

  const uploadMetrics = useMemo(() => {
    if (!insights) {
      return null;
    }
    const entries = Object.entries(insights.uploadResults);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    const accepted = insights.uploadResults.message_accepted_success ?? 0;
    const rejected = insights.uploadResults.message_sent_failed ?? 0;
    const duplicate = insights.uploadResults.duplicate_number_skipped ?? 0;
    return { total, accepted, rejected, duplicate };
  }, [insights]);

  const deliveryMetrics = useMemo(() => {
    if (!insights) {
      return null;
    }
    const byStatus = Object.fromEntries(
      insights.insight.statuses.map((item) => [item.status, item.count]),
    );
    return {
      total: insights.insight.total,
      accepted: byStatus.accepted ?? 0,
      sent: byStatus.sent ?? 0,
      delivered: byStatus.delivered ?? 0,
      read: byStatus.read ?? 0,
      failed: byStatus.failed ?? 0,
    };
  }, [insights]);

  const loadInsights = useCallback((campaign: RedlavaCsvCampaign) => {
    if (!campaign.fileUploadId) {
      setInsightsError("This campaign has no upload file id.");
      setInsights(null);
      return;
    }

    startTransition(async () => {
      setInsightsError(null);
      const result = await loadCampaignInsightsAction({
        campaignId: campaign.id,
        fileUploadId: campaign.fileUploadId!,
      });
      if (!result.ok) {
        setInsights(null);
        setInsightsError(result.error);
        return;
      }
      setInsights({
        uploadResults: result.uploadResults,
        insight: result.insight,
      });
    });
  }, []);

  const loadDetails = useCallback(
    (fileUploadId: string, page: number) => {
      startTransition(async () => {
        setTableError(null);
        const result = await loadCampaignDetailsAction({
          fileUploadId,
          page,
        });
        if (!result.ok) {
          setDetailRows([]);
          setTableError(result.error);
          return;
        }
        setDetailRows(result.rows);
        setDetailTotal(result.total);
        setDetailPage(result.page);
      });
    },
    [],
  );

  const loadMessages = useCallback((campaignId: string, page: number) => {
    startTransition(async () => {
      setTableError(null);
      const result = await loadCampaignMessagesAction({ campaignId, page });
      if (!result.ok) {
        setMessageRows([]);
        setTableError(result.error);
        return;
      }
      setMessageRows(result.rows);
      setMessageTotal(result.total);
      setMessagePage(result.page);
    });
  }, []);

  useEffect(() => {
    if (!selected?.fileUploadId) {
      return;
    }
    setDetailPage(1);
    setMessagePage(1);
    loadInsights(selected);
    loadDetails(selected.fileUploadId, 1);
    loadMessages(selected.id, 1);
  }, [selected, loadInsights, loadDetails, loadMessages]);

  useEffect(() => {
    if (!selected?.fileUploadId || tab !== "campaign") {
      return;
    }
    loadDetails(selected.fileUploadId, detailPage);
  }, [detailPage, tab, selected, loadDetails]);

  useEffect(() => {
    if (!selected || tab !== "messages") {
      return;
    }
    loadMessages(selected.id, messagePage);
  }, [messagePage, tab, selected, loadMessages]);

  function exportCsv() {
    if (!selected) {
      return;
    }
    setExporting(true);
    const params = new URLSearchParams({
      campaignId: selected.id,
      name: selected.name,
      tab,
    });
    if (tab === "campaign" && selected.fileUploadId) {
      params.set("fileUploadId", selected.fileUploadId);
    }
    window.location.href = `/api/ai/campaign/export?${params.toString()}`;
    window.setTimeout(() => setExporting(false), 1500);
  }

  if (!connected) {
    return (
      <section className="ai-campaign-insights">
        <p className="saas-form-message error">
          Connect RedLava in Settings to view campaign insights from your WhatsApp
          account.
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="ai-campaign-insights">
        <p className="saas-form-message error">{error}</p>
      </section>
    );
  }

  if (campaigns.length === 0) {
    return (
      <section className="ai-campaign-insights">
        <header className="ai-campaign-insights-head">
          <h2>Campaign insights</h2>
          <p>No CSV campaigns found on RedLava for this WhatsApp number yet.</p>
        </header>
      </section>
    );
  }

  return (
    <section className="ai-campaign-insights">
      <header className="ai-campaign-insights-head">
        <div>
          <h2>Campaign insights</h2>
          <p>
            Delivery stats from RedLava for bulk CSV campaigns - same metrics as the
            RedLava reporting panel.
          </p>
        </div>

        <label className="ai-campaign-select-wrap">
          <span>Campaign</span>
          <select
            className="ai-campaign-select"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden size={16} />
        </label>
      </header>

      {selected ? (
        <div className="ai-campaign-insights-body">
          <div className="ai-campaign-title-row">
            <div>
              <h3>{selected.name}</h3>
              <p>
                {selected.message?.templateName ? (
                  <>
                    Template <strong>{selected.message.templateName}</strong>
                    {selected.message.language
                      ? ` (${selected.message.language})`
                      : null}
                    {" - "}
                  </>
                ) : null}
                Scheduled {campaignScheduleLabel(selected)}
              </p>
            </div>
            <span className="ai-campaign-status-pill">Processed</span>
          </div>

          {insightsError ? (
            <p className="saas-form-message error">{insightsError}</p>
          ) : null}

          {pending && !insights ? (
            <p className="ai-campaign-loading">
              <Loader2 aria-hidden className="spin" size={16} />
              Loading campaign insights-
            </p>
          ) : null}

          {uploadMetrics ? (
            <div className="ai-campaign-metrics-block">
              <p className="ai-campaign-metrics-title">CSV file status</p>
              <div className="ai-campaign-metrics-grid">
                <MetricCard label="Total" tone="primary" value={uploadMetrics.total} />
                <MetricCard
                  icon={<CheckCircle2 aria-hidden size={18} />}
                  label="Accepted by Meta"
                  tone="success"
                  value={uploadMetrics.accepted}
                />
                <MetricCard
                  icon={<XCircle aria-hidden size={18} />}
                  label="Rejected by Meta"
                  tone="error"
                  value={uploadMetrics.rejected}
                />
                <MetricCard
                  icon={<MinusCircle aria-hidden size={18} />}
                  label="Duplicate skipped"
                  tone="neutral"
                  value={uploadMetrics.duplicate}
                />
              </div>
            </div>
          ) : null}

          {deliveryMetrics ? (
            <div className="ai-campaign-metrics-block">
              <p className="ai-campaign-metrics-title">
                Message status processed by Meta after acceptance
              </p>
              <div className="ai-campaign-metrics-grid is-wide">
                <MetricCard label="Total" tone="primary" value={deliveryMetrics.total} />
                <MetricCard
                  icon={<CheckCircle2 aria-hidden size={18} />}
                  label="Accepted"
                  tone="success"
                  value={deliveryMetrics.accepted}
                />
                <MetricCard label="Sent" tone="neutral" value={deliveryMetrics.sent} />
                <MetricCard
                  label="Delivered"
                  tone="neutral"
                  value={deliveryMetrics.delivered}
                />
                <MetricCard label="Read" tone="info" value={deliveryMetrics.read} />
                <MetricCard
                  icon={<XCircle aria-hidden size={18} />}
                  label="Failed"
                  tone="error"
                  value={deliveryMetrics.failed}
                />
              </div>
            </div>
          ) : null}

          <div className="ai-campaign-table-toolbar">
            <div className="ai-campaign-tabs" role="tablist" aria-label="Campaign tables">
              <button
                aria-selected={tab === "campaign"}
                className={`ai-campaign-tab${tab === "campaign" ? " is-active" : ""}`}
                role="tab"
                type="button"
                onClick={() => setTab("campaign")}
              >
                Campaign table
              </button>
              <button
                aria-selected={tab === "messages"}
                className={`ai-campaign-tab${tab === "messages" ? " is-active" : ""}`}
                role="tab"
                type="button"
                onClick={() => setTab("messages")}
              >
                Message table
              </button>
            </div>
            <button
              className="ai-campaign-export-btn"
              disabled={
                exporting ||
                pending ||
                !selected ||
                (tab === "campaign" && !selected.fileUploadId)
              }
              type="button"
              onClick={exportCsv}
            >
              <Download aria-hidden size={16} />
              {exporting ? "Exporting..." : "Download CSV"}
            </button>
          </div>

          {tableError ? <p className="saas-form-message error">{tableError}</p> : null}

          {tab === "campaign" ? (
            <div className="ai-campaign-table-wrap">
              <table className="ai-campaign-table">
                <thead>
                  <tr>
                    <th>Creation time</th>
                    <th>Receiver number</th>
                    <th>Result</th>
                    <th>Customer name</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatRedlavaEpoch(row.creationTime)}</td>
                      <td>{row.data.receiverNumber ?? "-"}</td>
                      <td>
                        <span
                          className={`ai-campaign-result-pill tone-${resultTone(row.result)}`}
                        >
                          {formatResultLabel(row.result)}
                        </span>
                      </td>
                      <td>{row.data["Customer Name"]?.trim() || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <CampaignPager
                page={detailPage}
                pageSize={25}
                pending={pending}
                total={detailTotal}
                onPageChange={setDetailPage}
              />
            </div>
          ) : (
            <div className="ai-campaign-table-wrap">
              <table className="ai-campaign-table">
                <thead>
                  <tr>
                    <th>Creation time</th>
                    <th>Receiver number</th>
                    <th>Status</th>
                    <th>Customer name</th>
                  </tr>
                </thead>
                <tbody>
                  {messageRows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatRedlavaEpoch(row.creationTime)}</td>
                      <td>{messagePhone(row)}</td>
                      <td>
                        <span
                          className={`ai-campaign-result-pill tone-${resultTone(row.lastStatus)}`}
                        >
                          {MESSAGE_STATUS_LABELS[row.lastStatus] ?? row.lastStatus}
                        </span>
                      </td>
                      <td>{messageCustomerName(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <CampaignPager
                page={messagePage}
                pageSize={25}
                pending={pending}
                total={messageTotal}
                onPageChange={setMessagePage}
              />
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function CampaignPager({
  page,
  pageSize,
  total,
  pending,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  pending: boolean;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <footer className="ai-campaign-pager">
      <span>
        {total.toLocaleString("en-IN")} rows - page {page} of {totalPages}
      </span>
      <div className="ai-campaign-pager-actions">
        <button
          disabled={page <= 1 || pending}
          type="button"
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          disabled={page >= totalPages || pending}
          type="button"
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </footer>
  );
}
