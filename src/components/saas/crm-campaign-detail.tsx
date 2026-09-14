"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addLeadsByCategoryToWaCampaignAction,
  addLeadsToWaCampaignAction,
  loadApprovedCampaignTemplatesAction,
  pauseWaCampaignAction,
  previewCategoryLeadsForCampaignAction,
  processWaCampaignBatchAction,
  removeWaCampaignRecipientAction,
  resumeWaCampaignAction,
  saveWaCampaignTemplateAction,
  searchCampaignLeadsAction,
  startWaCampaignSendAction,
} from "@/app/app/leads/campaign-actions";
import { CAMPAIGN_AUDIENCE_APPROACHED } from "@/lib/crm/wa-campaign-audiences";
import {
  CAMPAIGN_CONTACT_FIELDS,
  campaignStatusLabel,
} from "@/lib/crm/wa-campaign-variables";
import type { OfficialWaTemplate } from "@/lib/integrations/sheetomatic-official-wa";
import "./crm-campaigns.css";

export type CampaignDetailRecipient = {
  id: string;
  name: string | null;
  phone: string;
  status: string;
  error: string | null;
  errorCode: string | null;
};

export type CampaignDetailData = {
  id: string;
  name: string;
  status: string;
  templateName: string | null;
  templateLanguage: string;
  templateCategory: string | null;
  pauseReason: string | null;
  variableMap: Record<string, string>;
  counts: {
    total: number;
    pending: number;
    sent: number;
    failed: number;
    skipped: number;
  };
  recipients: CampaignDetailRecipient[];
};

export function CrmCampaignDetail({
  campaign,
  initialTemplates,
  templatesError,
  canSend,
  categories,
}: {
  campaign: CampaignDetailData;
  initialTemplates: OfficialWaTemplate[];
  templatesError: string | null;
  canSend: boolean;
  categories: Array<{ id: string; label: string; count: number }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [templates, setTemplates] = useState(initialTemplates);
  const [templateKey, setTemplateKey] = useState(() =>
    campaign.templateName
      ? `${campaign.templateName}::${campaign.templateLanguage}`
      : "",
  );
  const [variableMap, setVariableMap] = useState(campaign.variableMap);
  const [message, setMessage] = useState<string | null>(campaign.pauseReason);
  const [error, setError] = useState<string | null>(templatesError);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<
    Array<{
      id: string;
      name: string | null;
      phone: string | null;
      company: string | null;
    }>
  >([]);
  const [categoryId, setCategoryId] = useState(
    () => categories[0]?.id || CAMPAIGN_AUDIENCE_APPROACHED,
  );
  const [categoryPreview, setCategoryPreview] = useState<{
    count: number;
    label: string;
  } | null>(null);

  const selected = useMemo(
    () =>
      templates.find(
        (template) => `${template.name}::${template.language}` === templateKey,
      ) ?? null,
    [templateKey, templates],
  );

  useEffect(() => {
    if (campaign.status !== "RUNNING") {
      return;
    }
    const timer = window.setInterval(() => {
      startTransition(async () => {
        await processWaCampaignBatchAction({ campaignId: campaign.id });
        router.refresh();
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [campaign.id, campaign.status, router]);

  useEffect(() => {
    if (!categoryId) {
      setCategoryPreview(null);
      return;
    }
    let cancelled = false;
    startTransition(async () => {
      const result = await previewCategoryLeadsForCampaignAction({
        campaignId: campaign.id,
        category: categoryId,
      });
      if (cancelled) return;
      if (!result.ok) {
        setCategoryPreview(null);
        return;
      }
      setCategoryPreview({ count: result.count, label: result.label });
    });
    return () => {
      cancelled = true;
    };
  }, [campaign.id, categoryId]);

  function applyTemplate(next: OfficialWaTemplate | null) {
    if (!next) return;
    const nextMap = { ...variableMap };
    for (let i = 1; i <= next.variableCount; i += 1) {
      if (!nextMap[String(i)]) {
        nextMap[String(i)] = i === 1 ? "name" : i === 2 ? "company" : "city";
      }
    }
    setVariableMap(nextMap);
    startTransition(async () => {
      const result = await saveWaCampaignTemplateAction({
        campaignId: campaign.id,
        templateName: next.name,
        templateLanguage: next.language,
        templateCategory: next.category,
        variableMap: nextMap,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Template saved.");
      router.refresh();
    });
  }

  return (
    <div className="crm-campaigns-stack">
      {message ? <p className="crm-campaign-banner">{message}</p> : null}
      {error ? (
        <p className="crm-campaign-banner error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="crm-campaign-panel">
        <p className="crm-campaign-meta">
          <span className={`crm-campaign-status is-${campaign.status.toLowerCase()}`}>
            {campaignStatusLabel(campaign.status)}
          </span>
          {" · "}
          sent {campaign.counts.sent} · failed {campaign.counts.failed} · pending{" "}
          {campaign.counts.pending}
        </p>
        <div className="crm-campaign-actions" style={{ marginTop: "0.85rem" }}>
          {canSend && (campaign.status === "DRAFT" || campaign.status === "QUEUED") ? (
            <button
              type="button"
              className="btn-primary"
              disabled={pending || campaign.counts.pending === 0}
              onClick={() => {
                const templateLabel = selected?.name || campaign.templateName || "this template";
                const ok = window.confirm(
                  `Send to ${campaign.counts.pending} people using template ${templateLabel}?`,
                );
                if (!ok) return;
                setError(null);
                startTransition(async () => {
                  const result = await startWaCampaignSendAction({
                    campaignId: campaign.id,
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setMessage(
                    result.done
                      ? "Campaign finished."
                      : "Sending in batches. You can leave this page — it will keep going.",
                  );
                  router.refresh();
                });
              }}
            >
              Send
            </button>
          ) : null}
          {canSend && campaign.status === "RUNNING" ? (
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await pauseWaCampaignAction({
                    campaignId: campaign.id,
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setMessage("Paused. Resume when you want the rest to go out.");
                  router.refresh();
                });
              }}
            >
              Pause
            </button>
          ) : null}
          {canSend && campaign.status === "PAUSED" ? (
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() => {
                const templateLabel = selected?.name || campaign.templateName || "this template";
                const ok = window.confirm(
                  `Send to ${campaign.counts.pending} people using template ${templateLabel}?`,
                );
                if (!ok) return;
                startTransition(async () => {
                  const result = await resumeWaCampaignAction({
                    campaignId: campaign.id,
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setMessage("Resumed sending.");
                  router.refresh();
                });
              }}
            >
              Resume
            </button>
          ) : null}
        </div>
      </section>

      <section className="crm-campaign-panel">
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>Template</h2>
        <div className="crm-campaign-map">
          <select
            aria-label="Approved WhatsApp template"
            value={templateKey}
            onChange={(event) => {
              const key = event.target.value;
              setTemplateKey(key);
              const next =
                templates.find((template) => `${template.name}::${template.language}` === key) ??
                null;
              applyTemplate(next);
            }}
          >
            <option value="">Choose an approved template</option>
            {templates.map((template) => (
              <option
                key={`${template.name}::${template.language}`}
                value={`${template.name}::${template.language}`}
              >
                {template.name} · {template.language}
                {template.category ? ` · ${template.category}` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await loadApprovedCampaignTemplatesAction();
                if (!result.ok) {
                  setError(result.error ?? "Could not load templates.");
                  return;
                }
                setTemplates(result.templates);
                setMessage(
                  result.templates.length
                    ? `${result.templates.length} approved templates.`
                    : "No approved templates on Official API.",
                );
              });
            }}
          >
            Refresh templates
          </button>
        </div>
        {selected?.body ? (
          <p className="crm-campaign-meta" style={{ marginTop: "0.75rem" }}>
            {selected.body}
          </p>
        ) : null}
        {selected && selected.variableCount > 0 ? (
          <div className="crm-campaign-map" style={{ marginTop: "0.85rem" }}>
            {Array.from({ length: selected.variableCount }, (_, index) => {
              const slot = String(index + 1);
              return (
                <label key={slot} className="crm-campaign-map-row">
                  <span>{`{{${slot}}}`}</span>
                  <select
                    value={variableMap[slot] ?? ""}
                    onChange={(event) => {
                      const next = { ...variableMap, [slot]: event.target.value };
                      setVariableMap(next);
                      if (!selected) return;
                      startTransition(async () => {
                        await saveWaCampaignTemplateAction({
                          campaignId: campaign.id,
                          templateName: selected.name,
                          templateLanguage: selected.language,
                          templateCategory: selected.category,
                          variableMap: next,
                        });
                      });
                    }}
                  >
                    <option value="">Contact field</option>
                    {CAMPAIGN_CONTACT_FIELDS.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="crm-campaign-panel">
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>Add contacts</h2>
        <div className="crm-campaign-category">
          <label className="crm-campaign-category-row">
            <span>Category</span>
            <select
              aria-label="Campaign audience category"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setCategoryPreview(null);
              }}
            >
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                  {option.count ? ` (${option.count})` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="crm-campaign-category-row">
            <p className="crm-campaign-meta">
              {categoryPreview
                ? `${categoryPreview.count} contact${categoryPreview.count === 1 ? "" : "s"} in ${categoryPreview.label}`
                : "Pick a category to see how many people you’ll add."}
            </p>
            <button
              type="button"
              className="btn-primary"
              disabled={pending || !categoryId || (categoryPreview?.count ?? 0) === 0}
              onClick={() => {
                const count = categoryPreview?.count ?? 0;
                const label = categoryPreview?.label || "this category";
                if (count === 0) {
                  setError(`No new contacts in ${label}.`);
                  return;
                }
                const ok = window.confirm(
                  `Add ${count} contacts from ${label}?`,
                );
                if (!ok) return;
                setError(null);
                startTransition(async () => {
                  const result = await addLeadsByCategoryToWaCampaignAction({
                    campaignId: campaign.id,
                    category: categoryId,
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setMessage(
                    `Added ${result.added}${result.skipped ? ` · ${result.skipped} skipped` : ""}. Pick a template and send.`,
                  );
                  const next = await previewCategoryLeadsForCampaignAction({
                    campaignId: campaign.id,
                    category: categoryId,
                  });
                  if (next.ok) {
                    setCategoryPreview({ count: next.count, label: next.label });
                  }
                  router.refresh();
                });
              }}
            >
              Add all
            </button>
          </div>
        </div>
        <div className="crm-campaign-search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, phone, or company"
            aria-label="Search CRM contacts"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              startTransition(async () => {
                const rows = await searchCampaignLeadsAction({
                  campaignId: campaign.id,
                  q: query,
                });
                setHits(rows);
              });
            }}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={pending || query.trim().length < 2}
            onClick={() => {
              startTransition(async () => {
                const rows = await searchCampaignLeadsAction({
                  campaignId: campaign.id,
                  q: query,
                });
                setHits(rows);
              });
            }}
          >
            Search
          </button>
        </div>
        {hits.length > 0 ? (
          <div className="crm-campaign-hits">
            {hits.map((hit) => (
              <div key={hit.id} className="crm-campaign-hit">
                <div>
                  <strong>{hit.name || hit.company || hit.phone || "Contact"}</strong>
                  <p className="crm-campaign-meta">
                    {[hit.phone, hit.company].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await addLeadsToWaCampaignAction({
                        campaignId: campaign.id,
                        leadIds: [hit.id],
                      });
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setHits((current) => current.filter((row) => row.id !== hit.id));
                      setMessage(
                        result.added
                          ? "Added to campaign."
                          : "Skipped — already on the list or no mobile.",
                      );
                      router.refresh();
                    });
                  }}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="crm-campaign-meta">
            Or search one person. You can also add from Leads with Select.
          </p>
        )}
      </section>

      <section className="crm-campaign-panel">
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>People</h2>
        {campaign.recipients.length === 0 ? (
          <p className="crm-campaign-empty">No contacts on this campaign yet.</p>
        ) : (
          <div className="crm-campaign-table-wrap">
            <table className="crm-campaign-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaign.recipients.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.name || "No name"}
                      <div className="crm-campaign-meta">{row.phone}</div>
                    </td>
                    <td>
                      {row.status.toLowerCase()}
                      {row.error ? (
                        <span className="crm-campaign-row-error">
                          {row.errorCode ? `${row.errorCode}: ` : ""}
                          {row.error}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {row.status !== "SENT" && row.status !== "SENDING" ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              const result = await removeWaCampaignRecipientAction({
                                campaignId: campaign.id,
                                recipientId: row.id,
                              });
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              router.refresh();
                            });
                          }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
