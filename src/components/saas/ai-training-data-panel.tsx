"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowDownUp,
  Filter,
  Globe,
  HelpCircle,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import {
  archiveKnowledgeItem,
  createDocumentKnowledgeItem,
  createFaqKnowledgeItem,
  createWebsiteKnowledgeItem,
  createYoutubeChannelKnowledgeItem,
  generateFaqsFromKnowledgeItemAction,
  syncWebsiteKnowledgeItem,
  syncYoutubeChannelKnowledgeItem,
} from "@/app/ai/app/knowledge/actions";
import {
  AI_KNOWLEDGE_FILE_ACCEPT,
  AI_KNOWLEDGE_MAX_CONTENT_CHARS,
  AI_KNOWLEDGE_MAX_UPLOAD_BYTES,
  formatFileSize,
  formatKnowledgeMaxUploadSize,
  knowledgeUploadLimitSummary,
  validateKnowledgeUploadFile,
} from "@/lib/ai-knowledge-limits";
import {
  AI_KNOWLEDGE_ADD_INSTRUCTIONS,
  AI_KNOWLEDGE_ADD_MENU_HINTS,
  AI_KNOWLEDGE_OVERVIEW,
  AI_KNOWLEDGE_TAB_INSTRUCTIONS,
} from "@/lib/ai-knowledge-instructions";
import { AiKnowledgeInstructionPanel } from "@/components/saas/ai-knowledge-instruction-panel";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import { AiWhatsappMenuPreview } from "@/components/saas/ai-whatsapp-menu-preview";
import {
  AI_KNOWLEDGE_TYPE_LABELS,
  aiKnowledgeInitialState,
  type AiKnowledgeRow,
} from "@/lib/ai-knowledge-types";
import type { KnowledgeMenuItem } from "@/lib/whatsapp-bot/knowledge-menu";

type ViewTab = "articles" | "unanswered" | "needs-improvement";
type AddType = "faq" | "document" | "website" | "youtube" | null;
type SortKey = "createdAt" | "updatedAt";
type SortDir = "asc" | "desc";
type TypeFilter = "ALL" | "FAQ" | "DOCUMENT" | "WEBSITE" | "YOUTUBE_CHANNEL";

function formatDate(value: Date | string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function truncate(text: string, max = 120) {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max).trim()}...`;
}

function articleDescription(item: AiKnowledgeRow) {
  if (item.type === "FAQ" && item.question) {
    return item.question;
  }
  if (item.sourceUrl) {
    return item.sourceUrl;
  }
  return truncate(item.content, 100);
}

export function AiTrainingDataPanel({
  items,
  menuPreviewItems,
  stats,
  whatsAppConnected,
  botLive,
}: {
  items: AiKnowledgeRow[];
  menuPreviewItems: KnowledgeMenuItem[];
  stats: { faq: number; document: number; website: number; youtube: number; total: number };
  whatsAppConnected: boolean;
  botLive: boolean;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [viewTab, setViewTab] = useState<ViewTab>("articles");
  const [addType, setAddType] = useState<AddType>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [showFilter, setShowFilter] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [pasteLength, setPasteLength] = useState(0);
  const [pending, startTransition] = useTransition();

  const [faqState, faqAction, faqPending] = useActionState(
    createFaqKnowledgeItem,
    aiKnowledgeInitialState,
  );
  const [docState, docAction, docPending] = useActionState(
    createDocumentKnowledgeItem,
    aiKnowledgeInitialState,
  );
  const [webState, webAction, webPending] = useActionState(
    createWebsiteKnowledgeItem,
    aiKnowledgeInitialState,
  );
  const [youtubeState, youtubeAction, youtubePending] = useActionState(
    createYoutubeChannelKnowledgeItem,
    aiKnowledgeInitialState,
  );

  const filteredArticles = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = items;

    if (typeFilter !== "ALL") {
      rows = rows.filter((item) => item.type === typeFilter);
    }

    if (query) {
      rows = rows.filter((item) => {
        const haystack = [
          item.title,
          item.question ?? "",
          item.content,
          item.sourceUrl ?? "",
          AI_KNOWLEDGE_TYPE_LABELS[item.type],
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return [...rows].sort((a, b) => {
      const left = new Date(a[sortKey]).getTime();
      const right = new Date(b[sortKey]).getTime();
      return sortDir === "asc" ? left - right : right - left;
    });
  }, [items, search, sortDir, sortKey, typeFilter]);

  const allVisibleSelected =
    filteredArticles.length > 0 &&
    filteredArticles.every((item) => selectedIds.has(item.id));

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((value) => (value === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("desc");
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredArticles.map((item) => item.id)));
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openAdd(type: AddType) {
    setAddType(type);
    setShowAddMenu(false);
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function runArchive(itemId: string) {
    startTransition(async () => {
      const result = await archiveKnowledgeItem(itemId);
      setFeedback(result);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setFileError(null);
      setSelectedFileName(null);
      return;
    }

    setSelectedFileName(file.name);
    const check = validateKnowledgeUploadFile(file);
    setFileError(check.ok ? null : check.message);
  }

  function handleDocumentSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (file) {
      const check = validateKnowledgeUploadFile(file);
      if (!check.ok) {
        event.preventDefault();
        setFileError(check.message);
        return;
      }
    }

    const content = (
      form.elements.namedItem("content") as HTMLTextAreaElement | null
    )?.value.trim();

    if (!file && content && content.length > AI_KNOWLEDGE_MAX_CONTENT_CHARS) {
      event.preventDefault();
      setFeedback({
        ok: false,
        message: `Pasted content is too long. Maximum is ${AI_KNOWLEDGE_MAX_CONTENT_CHARS.toLocaleString()} characters.`,
      });
    }
  }

  function runSync(itemId: string, type: "WEBSITE" | "YOUTUBE_CHANNEL") {
    startTransition(async () => {
      const result =
        type === "YOUTUBE_CHANNEL"
          ? await syncYoutubeChannelKnowledgeItem(itemId)
          : await syncWebsiteKnowledgeItem(itemId);
      setFeedback(result);
    });
  }

  function runGenerateFaqs(itemId: string) {
    startTransition(async () => {
      const result = await generateFaqsFromKnowledgeItemAction(itemId);
      setFeedback(result);
    });
  }

  const activeFeedback =
    feedback ??
    (addType === "faq" && faqState.message
      ? faqState
      : addType === "document" && docState.message
        ? docState
        : addType === "website" && webState.message
          ? webState
          : addType === "youtube" && youtubeState.message
            ? youtubeState
            : null);

  useEffect(() => {
    if (faqState.ok && faqState.message) {
      setAddType(null);
      router.refresh();
    }
  }, [faqState, router]);

  useEffect(() => {
    if (docState.ok && docState.message) {
      setAddType(null);
      router.refresh();
    }
  }, [docState, router]);

  useEffect(() => {
    if (webState.ok && webState.message) {
      setAddType(null);
      router.refresh();
    }
  }, [webState, router]);

  useEffect(() => {
    if (youtubeState.ok && youtubeState.message) {
      setAddType(null);
      router.refresh();
    }
  }, [youtubeState, router]);

  return (
    <div className="ai-joyz-surface">
      <AiKnowledgeInstructionPanel block={AI_KNOWLEDGE_OVERVIEW} />

      <AiWhatsappMenuPreview botLive={botLive} items={menuPreviewItems} />

      {!whatsAppConnected || !botLive ? (
        <div className="ai-joyz-banner" role="status">
          {!whatsAppConnected
            ? "Connect WhatsApp in Settings to use training data in live chats."
            : "Go Live in Campaign to enable AI replies from this knowledge base."}
        </div>
      ) : null}

      <div className="ai-joyz-toolbar-row">
        <div className="ai-joyz-pill-tabs" role="tablist" aria-label="Training data views">
          <button
            aria-selected={viewTab === "articles"}
            className={`ai-joyz-pill-tab${viewTab === "articles" ? " is-active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setViewTab("articles")}
          >
            Articles
          </button>
          <button
            aria-selected={viewTab === "unanswered"}
            className={`ai-joyz-pill-tab${viewTab === "unanswered" ? " is-active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setViewTab("unanswered")}
          >
            Unanswered
          </button>
          <button
            aria-selected={viewTab === "needs-improvement"}
            className={`ai-joyz-pill-tab${viewTab === "needs-improvement" ? " is-active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setViewTab("needs-improvement")}
          >
            Needs Improvement
          </button>
        </div>

        {viewTab === "articles" ? (
          <div className="ai-joyz-toolbar-actions">
            <label className="ai-joyz-text-btn">
              <Search size={15} aria-hidden />
              <input
                aria-label="Search articles"
                placeholder="Search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <button
              className={`ai-joyz-text-btn${showFilter ? " is-active" : ""}`}
              type="button"
              onClick={() => setShowFilter((value) => !value)}
            >
              <Filter size={15} aria-hidden />
              Filter
            </button>
            <button
              className="ai-joyz-text-btn"
              type="button"
              onClick={() => router.refresh()}
            >
              <RefreshCw size={15} aria-hidden />
              Refresh
            </button>
            <div className="ai-joyz-add-wrap">
              <button
                className="ai-joyz-add-btn"
                type="button"
                onClick={() => setShowAddMenu((value) => !value)}
              >
                <Plus size={16} aria-hidden />
                Add
              </button>
              {showAddMenu ? (
                <div className="ai-joyz-add-menu">
                  <button type="button" onClick={() => openAdd("faq")}>
                    <HelpCircle size={16} aria-hidden />
                    <span>
                      FAQ article
                      <small>{AI_KNOWLEDGE_ADD_MENU_HINTS.faq}</small>
                    </span>
                  </button>
                  <button type="button" onClick={() => openAdd("document")}>
                    <Upload size={16} aria-hidden />
                    <span>
                      Document upload
                      <small>{AI_KNOWLEDGE_ADD_MENU_HINTS.document}</small>
                    </span>
                  </button>
                  <button type="button" onClick={() => openAdd("website")}>
                    <Globe size={16} aria-hidden />
                    <span>
                      Website sync
                      <small>{AI_KNOWLEDGE_ADD_MENU_HINTS.website}</small>
                    </span>
                  </button>
                  <button type="button" onClick={() => openAdd("youtube")}>
                    <Video size={16} aria-hidden />
                    <span>
                      YouTube channel
                      <small>{AI_KNOWLEDGE_ADD_MENU_HINTS.youtube}</small>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <AiKnowledgeInstructionPanel
        block={AI_KNOWLEDGE_TAB_INSTRUCTIONS[viewTab]}
        compact
        defaultOpen={viewTab !== "articles"}
      />

      {viewTab === "articles" && showFilter ? (
        <div className="ai-joyz-filter-bar">
          <span>Type</span>
          <select
            className="ai-joyz-select"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
          >
            <option value="ALL">All types</option>
            <option value="FAQ">FAQ</option>
            <option value="DOCUMENT">Document</option>
            <option value="WEBSITE">Website</option>
            <option value="YOUTUBE_CHANNEL">YouTube channel</option>
          </select>
          <span className="ai-joyz-filter-meta">
            {stats.total} total | {stats.faq} FAQs | {stats.document} docs |{" "}
            {stats.website} sites | {stats.youtube} channels
          </span>
        </div>
      ) : null}

      {viewTab === "articles" ? (
        <div className="ai-joyz-table-wrap">
          <table className="ai-joyz-table">
            <thead>
              <tr>
                <th className="ai-joyz-col-check">
                  <input
                    aria-label="Select all articles"
                    checked={allVisibleSelected}
                    type="checkbox"
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Title &amp; Description</th>
                <th>
                  <button
                    className="ai-joyz-sort-btn"
                    type="button"
                    onClick={() => toggleSort("createdAt")}
                  >
                    Created on
                    <ArrowDownUp size={14} aria-hidden />
                  </button>
                </th>
                <th>
                  <button
                    className="ai-joyz-sort-btn"
                    type="button"
                    onClick={() => toggleSort("updatedAt")}
                  >
                    Modified on
                    <ArrowDownUp size={14} aria-hidden />
                  </button>
                </th>
                <th>Status</th>
                <th className="ai-joyz-col-actions">
                  <SlidersHorizontal size={16} aria-hidden />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.length === 0 ? (
                <tr>
                  <td className="ai-joyz-empty-cell" colSpan={6}>
                    <strong>No articles found</strong>
                    <p>
                      Click + Add to create your first FAQ, document, website, or YouTube channel.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredArticles.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        aria-label={`Select ${item.title}`}
                        checked={selectedIds.has(item.id)}
                        type="checkbox"
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td>
                      <div className="ai-joyz-article-cell">
                        <strong>{item.title}</strong>
                        <span>{articleDescription(item)}</span>
                        <small>{AI_KNOWLEDGE_TYPE_LABELS[item.type]}</small>
                      </div>
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{formatDate(item.updatedAt)}</td>
                    <td>
                      <span className="ai-joyz-status-pill is-live">
                        {item.status === "ACTIVE" ? "Active" : item.status}
                      </span>
                    </td>
                    <td>
                      <div className="ai-joyz-row-actions">
                        {item.type === "WEBSITE" ||
                        item.type === "DOCUMENT" ||
                        item.type === "YOUTUBE_CHANNEL" ? (
                          <button
                            className="ai-joyz-icon-btn"
                            disabled={pending}
                            title="Generate FAQs from this article"
                            type="button"
                            onClick={() => runGenerateFaqs(item.id)}
                          >
                            <SheetomaticAiMark sizes="sm" />
                          </button>
                        ) : null}
                        {item.type === "WEBSITE" || item.type === "YOUTUBE_CHANNEL" ? (
                          <button
                            className="ai-joyz-icon-btn"
                            disabled={pending}
                            title={
                              item.type === "YOUTUBE_CHANNEL"
                                ? "Sync YouTube channel"
                                : "Sync website"
                            }
                            type="button"
                            onClick={() =>
                              runSync(
                                item.id,
                                item.type as "WEBSITE" | "YOUTUBE_CHANNEL",
                              )
                            }
                          >
                            <RefreshCw size={15} aria-hidden />
                          </button>
                        ) : null}
                        <button
                          className="ai-joyz-icon-btn"
                          disabled={pending}
                          title="Remove article"
                          type="button"
                          onClick={() => runArchive(item.id)}
                        >
                          <Trash2 size={15} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {viewTab === "unanswered" ? (
        <div className="ai-joyz-placeholder">
          <strong>No unanswered questions yet</strong>
          <p>
            Questions the AI could not answer will appear here. Add FAQs from this list
            using + Add so the next customer gets an automatic reply.
          </p>
        </div>
      ) : null}

      {viewTab === "needs-improvement" ? (
        <div className="ai-joyz-placeholder">
          <strong>No articles need improvement</strong>
          <p>
            Low-confidence replies and flagged articles will appear here. Edit or replace
            the matching article in the Articles tab.
          </p>
        </div>
      ) : null}

      {addType ? (
        <div ref={formRef} className="ai-joyz-add-panel">
          <div className="ai-joyz-add-panel-head">
            <h2>
              {addType === "faq"
                ? "Add FAQ article"
                : addType === "document"
                  ? "Upload document"
                  : addType === "website"
                    ? "Sync website"
                    : "Sync YouTube channel"}
            </h2>
            <button
              aria-label="Close add form"
              className="ai-joyz-icon-btn"
              type="button"
              onClick={() => setAddType(null)}
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          <AiKnowledgeInstructionPanel
            block={AI_KNOWLEDGE_ADD_INSTRUCTIONS[addType]}
            compact
          />

          {addType === "faq" ? (
            <form action={faqAction} className="ws-wa-submit-form">
              <div className="ws-wa-field ws-wa-field-full">
                <label className="ws-wa-field-label" htmlFor="faq-question">
                  Question
                </label>
                <input
                  className="ws-wa-input"
                  id="faq-question"
                  name="question"
                  placeholder="What are your business hours?"
                  required
                />
              </div>
              <div className="ws-wa-field ws-wa-field-full">
                <label className="ws-wa-field-label" htmlFor="faq-answer">
                  Answer
                </label>
                <textarea
                  className="ws-wa-textarea"
                  id="faq-answer"
                  name="answer"
                  placeholder="We are open Monday to Saturday, 10 AM to 7 PM IST."
                  required
                  rows={4}
                />
              </div>
              <button className="btn-cta btn-primary" disabled={faqPending} type="submit">
                Save FAQ
              </button>
            </form>
          ) : null}

          {addType === "document" ? (
            <>
              <div className="ws-training-upload-limits" role="note">
                <strong>Upload limits</strong>
                <ul>
                  <li>
                    Max file size: {formatKnowledgeMaxUploadSize()} (
                    {formatFileSize(AI_KNOWLEDGE_MAX_UPLOAD_BYTES)})
                  </li>
                  <li>Allowed types: PDF, DOCX, TXT, MD, CSV</li>
                  <li>
                    Max stored text: {AI_KNOWLEDGE_MAX_CONTENT_CHARS.toLocaleString()}{" "}
                    characters after extraction
                  </li>
                </ul>
              </div>
              <label className="ai-knowledge-generate-faq-option">
                <input defaultChecked name="generateFaqs" type="checkbox" value="on" />
                Automatically generate FAQs from this document (recommended)
              </label>
              <form
                action={docAction}
                className="ws-wa-submit-form"
                encType="multipart/form-data"
                onSubmit={handleDocumentSubmit}
              >
                <div className="ws-wa-field ws-wa-field-full">
                  <label className="ws-wa-field-label" htmlFor="doc-title">
                    Title (optional)
                  </label>
                  <input
                    className="ws-wa-input"
                    id="doc-title"
                    name="title"
                    placeholder="Auto-filled from file name or first line"
                  />
                </div>
                <div className="ws-wa-field ws-wa-field-full">
                  <label className="ws-wa-field-label" htmlFor="doc-file">
                    Upload file
                  </label>
                  <input
                    accept={AI_KNOWLEDGE_FILE_ACCEPT}
                    className="ws-wa-input"
                    id="doc-file"
                    name="file"
                    type="file"
                    onChange={handleFileChange}
                  />
                  <p className="ws-wa-field-hint">{knowledgeUploadLimitSummary()}</p>
                  {selectedFileName ? (
                    <p className="ws-wa-field-hint">
                      Selected: {selectedFileName}
                      {fileError ? null : " - within size limit"}
                    </p>
                  ) : null}
                  {fileError ? (
                    <p className="saas-form-message error" role="alert">
                      {fileError}
                    </p>
                  ) : null}
                </div>
                <div className="ws-wa-field ws-wa-field-full">
                  <label className="ws-wa-field-label" htmlFor="doc-content">
                    Or paste content
                  </label>
                  <textarea
                    className="ws-wa-textarea"
                    id="doc-content"
                    maxLength={AI_KNOWLEDGE_MAX_CONTENT_CHARS}
                    name="content"
                    placeholder="Paste your document text here if you are not uploading a file..."
                    rows={8}
                    onChange={(event) => setPasteLength(event.target.value.length)}
                  />
                  <p className="ws-wa-field-hint">
                    {pasteLength.toLocaleString()} /{" "}
                    {AI_KNOWLEDGE_MAX_CONTENT_CHARS.toLocaleString()} characters
                  </p>
                </div>
                <button
                  className="btn-cta btn-primary"
                  disabled={docPending || Boolean(fileError)}
                  type="submit"
                >
                  Save document
                </button>
              </form>
            </>
          ) : null}

          {addType === "website" ? (
            <form action={webAction} className="ws-wa-submit-form">
              <label className="ai-knowledge-generate-faq-option">
                <input defaultChecked name="generateFaqs" type="checkbox" value="on" />
                Automatically generate FAQs from this website page (recommended)
              </label>
              <div className="ws-wa-field ws-wa-field-full">
                <label className="ws-wa-field-label" htmlFor="web-url">
                  Page URL
                </label>
                <input
                  className="ws-wa-input"
                  id="web-url"
                  name="sourceUrl"
                  placeholder="https://sheetomatic.com/pricing"
                  required
                  type="url"
                />
              </div>
              <button className="btn-cta btn-primary" disabled={webPending} type="submit">
                Sync website
              </button>
            </form>
          ) : null}

          {addType === "youtube" ? (
            <form action={youtubeAction} className="ws-wa-submit-form">
              <label className="ai-knowledge-generate-faq-option">
                <input defaultChecked name="generateFaqs" type="checkbox" value="on" />
                Automatically generate FAQs from your channel videos (recommended)
              </label>
              <div className="ws-wa-field ws-wa-field-full">
                <label className="ws-wa-field-label" htmlFor="youtube-url">
                  Channel URL or @handle
                </label>
                <input
                  className="ws-wa-input"
                  id="youtube-url"
                  name="sourceUrl"
                  placeholder="https://www.youtube.com/@Sheetomatic"
                  required
                  type="text"
                />
              </div>
              <button
                className="btn-cta btn-primary"
                disabled={youtubePending}
                type="submit"
              >
                Sync channel
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {activeFeedback?.message ? (
        <p
          className={`saas-form-message ${activeFeedback.ok ? "ok" : "error"}`}
          role="status"
        >
          {activeFeedback.message}
        </p>
      ) : null}
    </div>
  );
}
