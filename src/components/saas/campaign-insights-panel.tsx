"use client";

import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  MinusCircle,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { AiCsvExportButton } from "@/components/saas/ai-csv-export-button";
import { AiKnowledgeInstructionPanel } from "@/components/saas/ai-knowledge-instruction-panel";
import { AI_CAMPAIGN_INSTRUCTIONS } from "@/lib/ai-knowledge-instructions";
import {
  loadCampaignDetailsAction,
  loadCampaignInsightsAction,
  loadCampaignListAction,
  loadCampaignMessagesAction,
} from "@/app/ai/app/campaign/actions";
import {
  MESSAGE_STATUS_LABELS,
  UPLOAD_RESULT_LABELS,
  campaignScheduleLabel,
  deriveCampaignStatus,
  displayCampaignRowNumber,
  formatRedlavaEpoch,
  type RedlavaCsvCampaign,
  type RedlavaCampaignDetailRow,
  type RedlavaMessageReportRow,
} from "@/lib/integrations/redlava-campaigns";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

type Tab = "campaign" | "messages";

type InsightsPayload = {
  uploadResults: Record<string, number>;
  insight: {
    total: number;
    statuses: Array<{ status: string; count: number }>;
  };
};

const UPLOAD_METRIC_FILTERS: Record<string, string | undefined> = {
  Total: undefined,
  "Accepted by Meta": "message_accepted_success",
  "Rejected by Meta": "message_sent_failed",
  "Duplicate skipped": "duplicate_number_skipped",
};

const DELIVERY_METRIC_FILTERS: Record<string, string | undefined> = {
  Total: undefined,
  Accepted: "accepted",
  Sent: "sent",
  Delivered: "delivered",
  Read: "read",
  Failed: "failed",
};

function MetricCard({
  label,
  value,
  tone = "neutral",
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: "primary" | "success" | "error" | "neutral" | "info";
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = [
    "ai-campaign-metric",
    `tone-${tone}`,
    onClick ? "is-clickable" : "",
    active ? "is-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <p className="ai-campaign-metric-label">{label}</p>
      <p className="ai-campaign-metric-value">
        {icon}
        {value.toLocaleString("en-IN")}
      </p>
    </>
  );

  if (!onClick) {
    return <article className={className}>{content}</article>;
  }

  return (
    <button className={className} type="button" onClick={onClick}>
      {content}
    </button>
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

function messageError(row: RedlavaMessageReportRow) {
  return row.error?.message?.trim() || row.error?.title?.trim() || "-";
}

function matchesTableSearch(haystack: string, query: string) {
  if (!query.trim()) {
    return true;
  }
  return haystack.toLowerCase().includes(query.trim().toLowerCase());
}

export function CampaignInsightsPanel({
  campaigns: initialCampaigns,
  connected,
  error: initialError,
}: {
  campaigns: RedlavaCsvCampaign[];
  connected: boolean;
  error?: string | null;
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [listError, setListError] = useState<string | null>(initialError ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState(initialCampaigns[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("campaign");
  const [insights, setInsights] = useState<InsightsPayload | null>(null);
  const [detailRows, setDetailRows] = useState<RedlavaCampaignDetailRow[]>([]);
  const [messageRows, setMessageRows] = useState<RedlavaMessageReportRow[]>([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [messageTotal, setMessageTotal] = useState(0);
  const [detailPage, setDetailPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [resultFilter, setResultFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [tableSearch, setTableSearch] = useState("");
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setCampaigns(initialCampaigns);
    setListError(initialError ?? null);
    setSelectedId((current) => {
      if (initialCampaigns.length === 0) {
        return "";
      }
      if (initialCampaigns.some((campaign) => campaign.id === current)) {
        return current;
      }
      return initialCampaigns[0].id;
    });
  }, [initialCampaigns, initialError]);

  const selected = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedId) ?? null,
    [campaigns, selectedId],
  );

  const uploadMetrics = useMemo(() => {
    if (!insights) {
      return null;
    }
    const accepted = insights.uploadResults.message_accepted_success ?? 0;
    const rejected = insights.uploadResults.message_sent_failed ?? 0;
    const duplicate = insights.uploadResults.duplicate_number_skipped ?? 0;
    const total = accepted + rejected + duplicate;
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

  const statusPill = useMemo(() => {
    if (!selected) {
      return null;
    }
    return deriveCampaignStatus(selected, uploadMetrics, deliveryMetrics);
  }, [selected, uploadMetrics, deliveryMetrics]);

  const activeFilterLabel = useMemo(() => {
    if (tab === "campaign" && resultFilter) {
      return formatResultLabel(resultFilter);
    }
    if (tab === "messages" && statusFilter) {
      return MESSAGE_STATUS_LABELS[statusFilter] ?? statusFilter;
    }
    return null;
  }, [tab, resultFilter, statusFilter]);

  const filteredDetailRows = useMemo(() => {
    if (!tableSearch.trim()) {
      return detailRows;
    }
    return detailRows.filter((row) => {
      const phone = row.data.receiverNumber ?? "";
      const name = row.data["Customer Name"]?.trim() ?? "";
      const remark = row.remark?.trim() ?? "";
      return (
        matchesTableSearch(phone, tableSearch) ||
        matchesTableSearch(name, tableSearch) ||
        matchesTableSearch(remark, tableSearch) ||
        matchesTableSearch(formatResultLabel(row.result), tableSearch)
      );
    });
  }, [detailRows, tableSearch]);

  const filteredMessageRows = useMemo(() => {
    if (!tableSearch.trim()) {
      return messageRows;
    }
    return messageRows.filter((row) => {
      return (
        matchesTableSearch(messagePhone(row), tableSearch) ||
        matchesTableSearch(messageCustomerName(row), tableSearch) ||
        matchesTableSearch(messageError(row), tableSearch) ||
        matchesTableSearch(
          MESSAGE_STATUS_LABELS[row.lastStatus] ?? row.lastStatus,
          tableSearch,
        )
      );
    });
  }, [messageRows, tableSearch]);

  const refreshCampaigns = useCallback(() => {
    startTransition(async () => {
      setRefreshing(true);
      setListError(null);
      const result = await loadCampaignListAction();
      setRefreshing(false);
      if (!result.ok) {
        setListError(result.error ?? "Could not refresh campaigns.");
        return;
      }
      setCampaigns(result.campaigns);
      if (result.campaigns.length === 0) {
        setSelectedId("");
        return;
      }
      if (!result.campaigns.some((campaign) => campaign.id === selectedId)) {
        setSelectedId(result.campaigns[0].id);
      }
    });
  }, [selectedId]);

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
    (fileUploadId: string, page: number, filter?: string) => {
      startTransition(async () => {
        setTableError(null);
        const result = await loadCampaignDetailsAction({
          fileUploadId,
          page,
          resultFilter: filter,
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

  const loadMessages = useCallback(
    (campaignId: string, page: number, filter?: string) => {
      startTransition(async () => {
        setTableError(null);
        const result = await loadCampaignMessagesAction({
          campaignId,
          page,
          statusFilter: filter,
        });
        if (!result.ok) {
          setMessageRows([]);
          setTableError(result.error);
          return;
        }
        setMessageRows(result.rows);
        setMessageTotal(result.total);
        setMessagePage(result.page);
      });
    },
    [],
  );

  useEffect(() => {
    if (!selected?.fileUploadId) {
      return;
    }
    setDetailPage(1);
    setMessagePage(1);
    setResultFilter(undefined);
    setStatusFilter(undefined);
    setTableSearch("");
    loadInsights(selected);
    loadDetails(selected.fileUploadId, 1);
    loadMessages(selected.id, 1);
  }, [selected?.id, selected?.fileUploadId, loadInsights, loadDetails, loadMessages]);

  useEffect(() => {
    if (!selected?.fileUploadId || tab !== "campaign") {
      return;
    }
    loadDetails(selected.fileUploadId, detailPage, resultFilter);
  }, [detailPage, tab, selected, loadDetails, resultFilter]);

  useEffect(() => {
    if (!selected || tab !== "messages") {
      return;
    }
    loadMessages(selected.id, messagePage, statusFilter);
  }, [messagePage, tab, selected, loadMessages, statusFilter]);

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

  function applyUploadMetricFilter(label: string) {
    const filter = UPLOAD_METRIC_FILTERS[label];
    setTab("campaign");
    setStatusFilter(undefined);
    setResultFilter(filter);
    setDetailPage(1);
    setTableSearch("");
  }

  function applyDeliveryMetricFilter(label: string) {
    const filter = DELIVERY_METRIC_FILTERS[label];
    setTab("messages");
    setResultFilter(undefined);
    setStatusFilter(filter);
    setMessagePage(1);
    setTableSearch("");
  }

  function clearTableFilters() {
    setResultFilter(undefined);
    setStatusFilter(undefined);
    setTableSearch("");
    if (tab === "campaign") {
      setDetailPage(1);
    } else {
      setMessagePage(1);
    }
  }

  if (!connected) {
    return (
      <section className="ai-campaign-insights">
        <AiKnowledgeInstructionPanel block={AI_CAMPAIGN_INSTRUCTIONS} defaultOpen />
        <p className="saas-form-message error">
          Connect RedLava in Settings to view campaign insights from your WhatsApp
          account.
        </p>
      </section>
    );
  }

  return (
    <section className="ai-campaign-insights">
      <AiKnowledgeInstructionPanel block={AI_CAMPAIGN_INSTRUCTIONS} defaultOpen={false} />

      <header className="ai-campaign-insights-head">
        <div>
          <h2>Campaign insights</h2>
          <p>
            Delivery stats from RedLava for bulk CSV campaigns — same metrics as the
            RedLava reporting panel.
          </p>
        </div>

        <div className="ai-campaign-head-actions">
          <button
            className="ai-campaign-refresh-btn"
            disabled={pending || refreshing}
            type="button"
            onClick={refreshCampaigns}
          >
            {pending || refreshing ? (
              <Loader2 aria-hidden className="spin" size={16} />
            ) : (
              <RefreshCw aria-hidden size={16} />
            )}
            Refresh campaigns
          </button>

          {campaigns.length > 0 ? (
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
          ) : null}
        </div>
      </header>

      {listError ? <p className="saas-form-message error">{listError}</p> : null}

      {campaigns.length === 0 ? (
        <p className="ai-campaign-empty-note">
          No CSV campaigns found on RedLava for this WhatsApp number yet. Create one in
          RedLava, then click <strong>Refresh campaigns</strong>.
        </p>
      ) : null}

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
                    {" · "}
                  </>
                ) : null}
                Scheduled {campaignScheduleLabel(selected)}
              </p>
            </div>
            {statusPill ? (
              <span className={`ai-campaign-status-pill tone-${statusPill.tone}`}>
                {statusPill.label}
              </span>
            ) : null}
          </div>

          {insightsError ? (
            <p className="saas-form-message error">{insightsError}</p>
          ) : null}

          {pending && !insights ? (
            <p className="ai-campaign-loading">
              <Loader2 aria-hidden className="spin" size={16} />
              Loading campaign insights…
            </p>
          ) : null}

          {uploadMetrics ? (
            <div className="ai-campaign-metrics-block">
              <p className="ai-campaign-metrics-title">CSV file status</p>
              <div className="ai-campaign-metrics-grid">
                <MetricCard
                  active={tab === "campaign" && !resultFilter}
                  label="Total"
                  tone="primary"
                  value={uploadMetrics.total}
                  onClick={() => applyUploadMetricFilter("Total")}
                />
                <MetricCard
                  active={resultFilter === "message_accepted_success"}
                  icon={<CheckCircle2 aria-hidden size={18} />}
                  label="Accepted by Meta"
                  tone="success"
                  value={uploadMetrics.accepted}
                  onClick={() => applyUploadMetricFilter("Accepted by Meta")}
                />
                <MetricCard
                  active={resultFilter === "message_sent_failed"}
                  icon={<XCircle aria-hidden size={18} />}
                  label="Rejected by Meta"
                  tone="error"
                  value={uploadMetrics.rejected}
                  onClick={() => applyUploadMetricFilter("Rejected by Meta")}
                />
                <MetricCard
                  active={resultFilter === "duplicate_number_skipped"}
                  icon={<MinusCircle aria-hidden size={18} />}
                  label="Duplicate skipped"
                  tone="neutral"
                  value={uploadMetrics.duplicate}
                  onClick={() => applyUploadMetricFilter("Duplicate skipped")}
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
                <MetricCard
                  active={tab === "messages" && !statusFilter}
                  label="Total"
                  tone="primary"
                  value={deliveryMetrics.total}
                  onClick={() => applyDeliveryMetricFilter("Total")}
                />
                <MetricCard
                  active={statusFilter === "accepted"}
                  icon={<CheckCircle2 aria-hidden size={18} />}
                  label="Accepted"
                  tone="success"
                  value={deliveryMetrics.accepted}
                  onClick={() => applyDeliveryMetricFilter("Accepted")}
                />
                <MetricCard
                  active={statusFilter === "sent"}
                  label="Sent"
                  tone="neutral"
                  value={deliveryMetrics.sent}
                  onClick={() => applyDeliveryMetricFilter("Sent")}
                />
                <MetricCard
                  active={statusFilter === "delivered"}
                  label="Delivered"
                  tone="neutral"
                  value={deliveryMetrics.delivered}
                  onClick={() => applyDeliveryMetricFilter("Delivered")}
                />
                <MetricCard
                  active={statusFilter === "read"}
                  label="Read"
                  tone="info"
                  value={deliveryMetrics.read}
                  onClick={() => applyDeliveryMetricFilter("Read")}
                />
                <MetricCard
                  active={statusFilter === "failed"}
                  icon={<XCircle aria-hidden size={18} />}
                  label="Failed"
                  tone="error"
                  value={deliveryMetrics.failed}
                  onClick={() => applyDeliveryMetricFilter("Failed")}
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
                onClick={() => {
                  setTab("campaign");
                  setTableSearch("");
                }}
              >
                Campaign table
              </button>
              <button
                aria-selected={tab === "messages"}
                className={`ai-campaign-tab${tab === "messages" ? " is-active" : ""}`}
                role="tab"
                type="button"
                onClick={() => {
                  setTab("messages");
                  setTableSearch("");
                }}
              >
                Message table
              </button>
            </div>
            <AiCsvExportButton
              className="mb-0.5"
              disabled={
                exporting ||
                pending ||
                !selected ||
                (tab === "campaign" && !selected.fileUploadId)
              }
              pending={exporting}
              onClick={exportCsv}
            />
          </div>

          <div className="ai-campaign-table-filters">
            <label className="ai-campaign-search">
              <Search aria-hidden size={15} />
              <input
                placeholder="Search phone, name, remark, or error on this page"
                type="search"
                value={tableSearch}
                onChange={(event) => setTableSearch(event.target.value)}
              />
            </label>
            {activeFilterLabel ? (
              <button
                className="ai-campaign-filter-clear"
                type="button"
                onClick={clearTableFilters}
              >
                <X aria-hidden size={14} />
                Clear filter: {activeFilterLabel}
              </button>
            ) : null}
          </div>

          {tableError ? <p className="saas-form-message error">{tableError}</p> : null}

          {tab === "campaign" ? (
            <div className="ai-campaign-table-wrap">
              <table className="ai-campaign-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Creation time</th>
                    <th>Receiver number</th>
                    <th>Result</th>
                    <th>Customer name</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetailRows.map((row, index) => (
                    <tr key={row.id}>
                      <td>
                        {displayCampaignRowNumber(
                          row,
                          index,
                          detailPage,
                          25,
                          detailTotal,
                        )}
                      </td>
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
                      <td className="ai-campaign-remark-cell">
                        {row.remark?.trim() || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDetailRows.length === 0 && !pending ? (
                <p className="ai-campaign-table-empty">No rows match this view.</p>
              ) : null}
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
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessageRows.map((row) => (
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
                      <td className="ai-campaign-remark-cell">{messageError(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMessageRows.length === 0 && !pending ? (
                <p className="ai-campaign-table-empty">No rows match this view.</p>
              ) : null}
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
        {total.toLocaleString("en-IN")} rows · page {page} of {totalPages}
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
