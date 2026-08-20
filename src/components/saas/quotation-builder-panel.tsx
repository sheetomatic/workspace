"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, MessageCircle, Phone, Plus, Trash2 } from "lucide-react";
import type { QuotationRequestType, QuotationStatus } from "@prisma/client";
import {
  createLeadQuotation,
  createLeadServiceCatalogItem,
  deleteLeadQuotation,
  logLeadContactAction,
  reviseLeadQuotation,
  sendLeadQuotationEmail,
  sendLeadQuotationWhatsApp,
} from "@/app/app/leads/actions";
import { formatInr } from "@/lib/leads/categories";
import {
  leadTelHref,
  leadWhatsAppHref,
} from "@/lib/leads/contact-links";
import {
  computeQuotationEndDate,
  formatQuotationProjectDate,
  isoDateInputValue,
  paymentTermsForRequestType,
  quotationStatusLabel,
} from "@/lib/leads/quotation-content";
import { QuotationPrintView } from "@/components/saas/quotation-print-view";
import {
  computeWebsitePricingLineTotal,
  findWebsitePricingProduct,
  listWebsitePricingProducts,
  parseMoneyInput,
  type WebsitePricingProduct,
} from "@/lib/leads/website-pricing-catalog";

type CatalogItem = {
  id: string;
  serviceCategory: string;
  subCategory: string;
};

type QuotationLine = {
  id: string;
  serviceCategory: string;
  subCategory: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
};

type QuotationRow = {
  id: string;
  quotationNumber: string;
  requestType: QuotationRequestType;
  status: QuotationStatus;
  revisionNumber: number;
  totalAmount: string | number;
  subtotal: string | number;
  quotationDate: string;
  projectStartDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  company: string | null;
  address: string | null;
  zipCode: string | null;
  scopeNotes: string | null;
  paymentTerms: string | null;
  advanceRequired: string | number | null;
  notes: string | null;
  sentAt: string | null;
  lockedAt: string | null;
  shareToken: string | null;
  lines: QuotationLine[];
};

type OfferedServiceRow = {
  id: string;
  serviceCategory: string;
  subCategory: string;
  catalogId: string | null;
};

type LineDraft = {
  id: string;
  catalogId: string;
  amount: string;
  perUserCost: string;
  users: string;
};

const WEBSITE_PRICING_PRODUCTS = listWebsitePricingProducts();

function createLineId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveCatalogId(
  item: OfferedServiceRow,
  serviceCatalog: CatalogItem[],
) {
  if (item.catalogId) {
    return item.catalogId;
  }
  const match = serviceCatalog.find(
    (catalog) =>
      catalog.serviceCategory === item.serviceCategory &&
      catalog.subCategory === item.subCategory,
  );
  return match?.id ?? null;
}

function buildLineDrafts(
  offeredServices: OfferedServiceRow[],
  serviceCatalog: CatalogItem[],
): LineDraft[] {
  if (offeredServices.length > 0) {
    const rows = offeredServices.flatMap((item) => {
      const catalogId = resolveCatalogId(item, serviceCatalog);
      if (!catalogId) {
        return [];
      }
      return [{ id: createLineId(), catalogId, amount: "", perUserCost: "", users: "" }];
    });
    if (rows.length > 0) {
      return rows;
    }
  }

  if (serviceCatalog.length === 0) {
    return [{ id: createLineId(), catalogId: "", amount: "", perUserCost: "", users: "" }];
  }

  return [{ id: createLineId(), catalogId: "", amount: "", perUserCost: "", users: "" }];
}

function usedCatalogIdsElsewhere(lineDrafts: LineDraft[], currentLineId: string) {
  return new Set(
    lineDrafts
      .filter((line) => line.id !== currentLineId && line.catalogId)
      .map((line) => line.catalogId),
  );
}

function catalogOptionsForLine(
  serviceCatalog: CatalogItem[],
  lineDrafts: LineDraft[],
  currentLineId: string,
  currentCatalogId: string,
) {
  const usedElsewhere = usedCatalogIdsElsewhere(lineDrafts, currentLineId);
  return serviceCatalog.filter(
    (item) => item.id === currentCatalogId || !usedElsewhere.has(item.id),
  );
}

function websiteOptionsForLine(
  lineDrafts: LineDraft[],
  currentLineId: string,
  currentCatalogId: string,
) {
  const usedElsewhere = usedCatalogIdsElsewhere(lineDrafts, currentLineId);
  return WEBSITE_PRICING_PRODUCTS.filter(
    (item) => item.id === currentCatalogId || !usedElsewhere.has(item.id),
  );
}

function groupWebsiteProducts(products: WebsitePricingProduct[]) {
  return {
    suite: products.filter((item) => item.kind === "suite"),
    module: products.filter((item) => item.kind === "module"),
    addon: products.filter((item) => item.kind === "addon"),
  };
}

function websiteProductLabel(item: WebsitePricingProduct) {
  const amount = item.defaultAmount > 0 ? ` · ₹${item.defaultAmount.toLocaleString("en-IN")}` : "";
  return `${item.name}${amount}`;
}

function websiteProductHint(item: WebsitePricingProduct) {
  const parts: string[] = [];
  if (item.defaultUsers != null && item.defaultUsers > 0) {
    parts.push(`${item.defaultUsers} users in list price`);
  }
  if (item.defaultPerUserCost != null && item.defaultPerUserCost > 0) {
    parts.push(`₹${item.defaultPerUserCost.toLocaleString("en-IN")}/user`);
  }
  return parts.join(" · ");
}

function catalogLabel(item: CatalogItem) {
  return `${item.serviceCategory} — ${item.subCategory}`;
}

function lineDraftFromCatalogId(catalogId: string): Pick<
  LineDraft,
  "catalogId" | "amount" | "perUserCost" | "users"
> {
  const website = findWebsitePricingProduct(catalogId);
  if (!website) {
    return { catalogId, amount: "", perUserCost: "", users: "" };
  }
  return {
    catalogId,
    amount: website.defaultAmount > 0 ? String(website.defaultAmount) : "",
    perUserCost:
      website.defaultPerUserCost != null ? String(website.defaultPerUserCost) : "",
    users: "",
  };
}

export function QuotationBuilderPanel({
  leadId,
  leadName,
  leadPhone,
  leadEmail,
  leadCompany,
  leadAddress,
  leadZipCode,
  leadRequirement,
  offeredServices,
  serviceCatalog,
  quotations,
  organizationName,
  organizationLogoUrl,
  canManage,
  canDelete = canManage,
  pending,
  startTransition,
}: {
  leadId: string;
  leadName: string | null;
  leadPhone: string | null;
  leadEmail: string | null;
  leadCompany: string | null;
  leadAddress: string | null;
  leadZipCode: string | null;
  leadRequirement: string | null;
  offeredServices: OfferedServiceRow[];
  serviceCatalog: CatalogItem[];
  quotations: QuotationRow[];
  organizationName: string;
  organizationLogoUrl: string | null;
  canManage: boolean;
  /** Deleting quotations stays MANAGER+ even when staff can work the lead. */
  canDelete?: boolean;
  pending: boolean;
  startTransition: (callback: () => Promise<void>) => void;
}) {
  const [addedCatalogItems, setAddedCatalogItems] = useState<CatalogItem[]>([]);
  const catalogItems = useMemo(() => {
    const byId = new Map(serviceCatalog.map((item) => [item.id, item]));
    for (const item of addedCatalogItems) {
      byId.set(item.id, item);
    }
    return Array.from(byId.values());
  }, [addedCatalogItems, serviceCatalog]);
  const [showNewServiceForm, setShowNewServiceForm] = useState(false);
  const [newServiceCategory, setNewServiceCategory] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceTargetLineId, setNewServiceTargetLineId] = useState<string | null>(null);
  const [newServiceMessage, setNewServiceMessage] = useState<string | null>(null);
  const [quoteType, setQuoteType] = useState<QuotationRequestType>("PROPOSAL");
  const [quoteStartDate, setQuoteStartDate] = useState(() => isoDateInputValue());
  const [quoteDuration, setQuoteDuration] = useState("30");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [scopeNotes, setScopeNotes] = useState(leadRequirement ?? "");
  const [paymentTerms, setPaymentTerms] = useState(() =>
    paymentTermsForRequestType("PROPOSAL"),
  );
  const [advanceRequired, setAdvanceRequired] = useState("");
  const [billCompany, setBillCompany] = useState(leadCompany ?? "");
  const [billAddress, setBillAddress] = useState(leadAddress ?? "");
  const [billZip, setBillZip] = useState(leadZipCode ?? "");
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>(() =>
    buildLineDrafts(offeredServices, serviceCatalog),
  );
  const [setupCost, setSetupCost] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(
    quotations[0]?.id ?? null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const telHref = leadTelHref(leadPhone);
  const waLeadHref = leadWhatsAppHref(leadPhone, leadName);

  const validLines = useMemo(
    () =>
      lineDrafts.filter(
        (line) =>
          Boolean(line.catalogId) &&
          computeWebsitePricingLineTotal({
            amount: line.amount,
            perUserCost: line.perUserCost,
            users: line.users,
          }) > 0,
      ),
    [lineDrafts],
  );

  const setupCostAmount = parseMoneyInput(setupCost);

  const manualTotal = useMemo(
    () =>
      validLines.reduce(
        (sum, line) =>
          sum +
          computeWebsitePricingLineTotal({
            amount: line.amount,
            perUserCost: line.perUserCost,
            users: line.users,
          }),
        setupCostAmount,
      ),
    [setupCostAmount, validLines],
  );

  const projectEndDate = useMemo(() => {
    const durationDays = Number.parseInt(quoteDuration, 10);
    const start = new Date(`${quoteStartDate}T12:00:00`);
    if (Number.isNaN(start.getTime()) || !Number.isFinite(durationDays)) {
      return null;
    }
    return computeQuotationEndDate(start, durationDays);
  }, [quoteDuration, quoteStartDate]);

  const previewQuote = quotations.find((item) => item.id === previewId) ?? null;
  const isLocked = (quote: QuotationRow) =>
    quote.status === "LOCKED" || Boolean(quote.lockedAt);

  function updateLineDraft(lineId: string, patch: Partial<LineDraft>) {
    setLineDrafts((current) =>
      current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    );
  }

  function openNewServiceForm(lineId?: string) {
    setNewServiceTargetLineId(lineId ?? lineDrafts[lineDrafts.length - 1]?.id ?? null);
    setNewServiceMessage(null);
    setShowNewServiceForm(true);
  }

  function saveNewService() {
    setNewServiceMessage(null);
    startTransition(async () => {
      const result = await createLeadServiceCatalogItem({
        serviceCategory: newServiceCategory,
        subCategory: newServiceName,
        unitPrice: newServicePrice,
      });
      if (!result.ok || !result.item) {
        setNewServiceMessage(result.message ?? "Could not add service.");
        return;
      }

      const item = result.item;
      const defaultAmount =
        result.item.unitPrice != null ? String(result.item.unitPrice) : "";

      setAddedCatalogItems((current) => {
        if (current.some((entry) => entry.id === item.id)) {
          return current;
        }
        return [...current, item];
      });

      const targetLineId = newServiceTargetLineId ?? lineDrafts[0]?.id;
      if (targetLineId) {
        updateLineDraft(targetLineId, {
          catalogId: item.id,
          amount: defaultAmount,
          perUserCost: "",
          users: "",
        });
      } else {
        setLineDrafts([
          {
            id: createLineId(),
            catalogId: item.id,
            amount: defaultAmount,
            perUserCost: "",
            users: "",
          },
        ]);
      }

      setNewServiceCategory("");
      setNewServiceName("");
      setNewServicePrice("");
      setShowNewServiceForm(false);
      setNewServiceTargetLineId(null);
      setNewServiceMessage(result.message ?? "Service added.");
    });
  }

  function addLineDraft() {
    setLineDrafts((current) => [
      ...current,
      {
        id: createLineId(),
        catalogId: "",
        amount: "",
        perUserCost: "",
        users: "",
      },
    ]);
  }

  function removeLineDraft(lineId: string) {
    setLineDrafts((current) => {
      if (current.length <= 1) {
        return current;
      }
      return current.filter((line) => line.id !== lineId);
    });
  }

  function runAction(label: string, action: () => Promise<{ ok: boolean; message?: string }>) {
    setActionMessage(null);
    startTransition(async () => {
      const result = await action();
      setActionMessage(result.ok ? `${label} done.` : result.message ?? `${label} failed.`);
    });
  }

  function logContact(type: "CALL" | "WHATSAPP") {
    startTransition(async () => {
      await logLeadContactAction(leadId, type);
    });
  }

  const canGenerate = validLines.length > 0 || setupCostAmount > 0;

  return (
    <section className="leads-drawer-section leads-quotation-workspace">
      <div className="leads-quote-workspace-head">
        <h3>Quotation / Invoice</h3>
        <Link
          className="leads-action-btn"
          href="/app/leads/quotations"
          target="_blank"
        >
          View all quotations
        </Link>
      </div>

      {canManage ? (
        <div className="leads-drawer-form leads-quote-builder">
          <label>
            Type
            <select
              value={quoteType}
              onChange={(e) => {
                const next = e.target.value as QuotationRequestType;
                setQuoteType(next);
                setPaymentTerms(paymentTermsForRequestType(next));
              }}
            >
              <option value="PROPOSAL">Proposal</option>
              <option value="INVOICE">Invoice</option>
            </select>
          </label>
          <label>
            Project start
            <input
              type="date"
              value={quoteStartDate}
              onChange={(e) => setQuoteStartDate(e.target.value)}
            />
          </label>
          <label>
            No. of days
            <input
              type="number"
              min="0"
              value={quoteDuration}
              onChange={(e) => setQuoteDuration(e.target.value)}
            />
          </label>
          <label>
            End date
            <input
              type="text"
              readOnly
              value={formatQuotationProjectDate(projectEndDate)}
              className="leads-quote-end-date"
            />
          </label>
          <label>
            Bill to company
            <input value={billCompany} onChange={(e) => setBillCompany(e.target.value)} />
          </label>
          <label>
            Address
            <input value={billAddress} onChange={(e) => setBillAddress(e.target.value)} />
          </label>
          <label>
            ZIP
            <input value={billZip} onChange={(e) => setBillZip(e.target.value)} />
          </label>
          <label>
            Advance required (₹)
            <input
              type="number"
              value={advanceRequired}
              onChange={(e) => setAdvanceRequired(e.target.value)}
              placeholder="Enter advance amount"
            />
          </label>
          <label>
            One-time setup (₹)
            <input
              type="number"
              min="0"
              value={setupCost}
              onChange={(e) => setSetupCost(e.target.value)}
              placeholder="e.g. 10000"
            />
          </label>
          <label className="leads-form-span-2">
            Scope / requirement
            <textarea
              rows={3}
              value={scopeNotes}
              onChange={(e) => setScopeNotes(e.target.value)}
            />
          </label>
          <label className="leads-form-span-2">
            Payment terms
            <textarea
              rows={2}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </label>
          <label className="leads-form-span-2">
            Internal notes
            <textarea
              rows={2}
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
            />
          </label>

          <div className="leads-form-span-2">
            <p className="leads-quote-lines-label">Line items</p>
            <p className="leads-machine-muted leads-quote-line-hint">
              Website /pricing products are listed below. Line total = amount + (per user × users).
              For suite plans, amount already includes listed seats — put extra seats in Users.
            </p>
                <div className="leads-quote-line-table-wrap">
                  <table className="leads-quote-line-table leads-quote-line-table-pricing">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Amount (₹)</th>
                        <th>Per user (₹)</th>
                        <th>Users</th>
                        <th>Line total</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {lineDrafts.map((line) => {
                        const options = catalogOptionsForLine(
                          catalogItems,
                          lineDrafts,
                          line.id,
                          line.catalogId,
                        );
                        const websiteOptions = websiteOptionsForLine(
                          lineDrafts,
                          line.id,
                          line.catalogId,
                        );
                        const grouped = groupWebsiteProducts(websiteOptions);
                        const selectedWebsite = findWebsitePricingProduct(line.catalogId);
                        const lineTotal = computeWebsitePricingLineTotal({
                          amount: line.amount,
                          perUserCost: line.perUserCost,
                          users: line.users,
                        });
                        const hint = selectedWebsite
                          ? websiteProductHint(selectedWebsite)
                          : "";
                        return (
                          <tr key={line.id}>
                            <td>
                              <select
                                className="leads-quote-line-select"
                                value={line.catalogId}
                                onChange={(e) => {
                                  if (e.target.value === "__new__") {
                                    openNewServiceForm(line.id);
                                    return;
                                  }
                                  updateLineDraft(
                                    line.id,
                                    lineDraftFromCatalogId(e.target.value),
                                  );
                                }}
                              >
                                <option value="">Select service</option>
                                {grouped.suite.length > 0 ? (
                                  <optgroup label="Website — EM Ready Suite">
                                    {grouped.suite.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {websiteProductLabel(item)}
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null}
                                {grouped.module.length > 0 ? (
                                  <optgroup label="Website — Modules">
                                    {grouped.module.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {websiteProductLabel(item)}
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null}
                                {grouped.addon.length > 0 ? (
                                  <optgroup label="Website — Add-ons">
                                    {grouped.addon.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {websiteProductLabel(item)}
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null}
                                {options.length > 0 ? (
                                  <optgroup label="Your catalog">
                                    {options.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {catalogLabel(item)}
                                      </option>
                                    ))}
                                  </optgroup>
                                ) : null}
                                <option value="__new__">+ Add new service…</option>
                              </select>
                              {hint ? (
                                <p className="leads-quote-line-product-hint">{hint}</p>
                              ) : null}
                            </td>
                            <td>
                              <input
                                className="leads-quote-line-amount-input"
                                type="number"
                                min="0"
                                value={line.amount}
                                placeholder="0"
                                onChange={(e) =>
                                  updateLineDraft(line.id, { amount: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="leads-quote-line-amount-input"
                                type="number"
                                min="0"
                                value={line.perUserCost}
                                placeholder="0"
                                onChange={(e) =>
                                  updateLineDraft(line.id, {
                                    perUserCost: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="leads-quote-line-amount-input"
                                type="number"
                                min="0"
                                value={line.users}
                                placeholder="0"
                                onChange={(e) =>
                                  updateLineDraft(line.id, { users: e.target.value })
                                }
                              />
                            </td>
                            <td className="leads-quote-line-total-cell">
                              {formatInr(lineTotal)}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="leads-icon-btn danger"
                                title="Remove line"
                                aria-label="Remove line"
                                disabled={lineDrafts.length === 1}
                                onClick={() => removeLineDraft(line.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="leads-quote-line-actions-row">
                  <button
                    type="button"
                    className="btn-secondary btn-sm leads-quote-add-line"
                    onClick={addLineDraft}
                  >
                    <Plus size={14} />
                    Add line item
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm leads-quote-add-line"
                    onClick={() => openNewServiceForm()}
                  >
                    <Plus size={14} />
                    Add new service
                  </button>
                </div>
                {showNewServiceForm ? (
                  <div className="leads-quote-new-service">
                    <p className="leads-quote-new-service-title">New service for this client</p>
                    <div className="leads-quote-new-service-grid">
                      <label>
                        Category
                        <input
                          value={newServiceCategory}
                          onChange={(e) => setNewServiceCategory(e.target.value)}
                          placeholder="e.g. Training, Development"
                        />
                      </label>
                      <label>
                        Service name
                        <input
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                          placeholder="e.g. Custom Google Sheets setup"
                        />
                      </label>
                      <label>
                        Default price (₹)
                        <input
                          type="number"
                          min="0"
                          value={newServicePrice}
                          onChange={(e) => setNewServicePrice(e.target.value)}
                          placeholder="Optional"
                        />
                      </label>
                    </div>
                    <div className="leads-quote-new-service-actions">
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={
                          pending ||
                          !newServiceCategory.trim() ||
                          !newServiceName.trim()
                        }
                        onClick={saveNewService}
                      >
                        Save service
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        disabled={pending}
                        onClick={() => {
                          setShowNewServiceForm(false);
                          setNewServiceMessage(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    {newServiceMessage ? (
                      <p className="leads-quote-new-service-msg">{newServiceMessage}</p>
                    ) : null}
                  </div>
                ) : null}
            {manualTotal > 0 ? (
              <p className="leads-quote-estimate">
                Draft total: <strong>{formatInr(manualTotal)}</strong>
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="btn-primary leads-form-span-2"
            disabled={pending || !canGenerate}
            onClick={() =>
              runAction("Generate", async () => {
                const result = await createLeadQuotation({
                  leadId,
                  requestType: quoteType,
                  projectStartDate: quoteStartDate,
                  durationDays: quoteDuration,
                  notes: quoteNotes,
                  scopeNotes,
                  paymentTerms,
                  advanceRequired,
                  company: billCompany,
                  address: billAddress,
                  zipCode: billZip,
                  lineCatalogIds: [],
                  lineItems: validLines.map((line) => ({
                    catalogId: line.catalogId,
                    unitPrice: line.amount,
                    perUserCost: line.perUserCost,
                    users: line.users,
                  })),
                  setupCost,
                });
                if (result.ok && result.quotationId) {
                  setPreviewId(result.quotationId);
                }
                return result;
              })
            }
          >
            Generate {quoteType === "INVOICE" ? "invoice" : "proposal"}
          </button>
        </div>
      ) : null}

      {actionMessage ? <p className="leads-quote-action-msg">{actionMessage}</p> : null}

      <ul className="leads-quote-list">
        {quotations.length === 0 ? (
          <li className="leads-machine-muted">No quotations yet.</li>
        ) : (
          quotations.map((quote) => (
            <li
              key={quote.id}
              className={previewId === quote.id ? "is-active" : undefined}
            >
              <div className="leads-quote-row">
                <button
                  type="button"
                  className="leads-quote-select"
                  onClick={() => setPreviewId(quote.id)}
                >
                  <strong>{quote.quotationNumber}</strong>
                  <span>
                    {quote.requestType} · {formatInr(Number(quote.totalAmount))}
                    {quote.revisionNumber > 1 ? ` · R${quote.revisionNumber}` : ""}
                    {" · "}
                    {quote.requestType === "INVOICE"
                      ? "Invoice Generated"
                      : "Quotation Generated"}{" "}
                    {new Date(quote.quotationDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                  <em className={`leads-quote-status leads-quote-status-${quote.status.toLowerCase()}`}>
                    {quotationStatusLabel(quote.status)}
                  </em>
                </button>
                <div className="leads-quote-row-actions">
                  {telHref ? (
                    <a
                      className="leads-icon-btn"
                      href={telHref}
                      title="Call"
                      aria-label="Call"
                      onClick={() => logContact("CALL")}
                    >
                      <Phone size={16} />
                    </a>
                  ) : null}
                  {canManage && !isLocked(quote) ? (
                    <button
                      type="button"
                      className="leads-icon-btn"
                      title="Send on WhatsApp"
                      aria-label="Send on WhatsApp"
                      disabled={pending}
                      onClick={() =>
                        runAction("WhatsApp", async () => {
                          const result = await sendLeadQuotationWhatsApp(quote.id);
                          if (result.ok && result.waUrl) {
                            window.open(result.waUrl, "_blank", "noopener,noreferrer");
                          }
                          return result;
                        })
                      }
                    >
                      <MessageCircle size={16} />
                    </button>
                  ) : waLeadHref ? (
                    <a
                      className="leads-icon-btn"
                      href={waLeadHref}
                      target="_blank"
                      rel="noreferrer"
                      title="WhatsApp"
                      aria-label="WhatsApp"
                      onClick={() => logContact("WHATSAPP")}
                    >
                      <MessageCircle size={16} />
                    </a>
                  ) : null}
                  <Link
                    className="leads-icon-btn"
                    href={`/app/leads/quotations/${quote.id}/print`}
                    target="_blank"
                    title="PDF / Print"
                    aria-label="PDF / Print"
                  >
                    <FileText size={16} />
                  </Link>
                  {canDelete && !isLocked(quote) ? (
                    <button
                      type="button"
                      className="leads-icon-btn danger"
                      title="Delete quotation"
                      aria-label="Delete quotation"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm(`Delete ${quote.quotationNumber}?`)) {
                          runAction("Delete", async () => {
                            const result = await deleteLeadQuotation(quote.id);
                            if (result.ok && previewId === quote.id) {
                              setPreviewId(
                                quotations.find((item) => item.id !== quote.id)?.id ?? null,
                              );
                            }
                            return result;
                          });
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
              </div>
              {canManage && !isLocked(quote) ? (
                <div className="leads-quote-secondary-actions">
                  <button
                    type="button"
                    className="leads-action-btn"
                    disabled={pending}
                    onClick={() =>
                      runAction("Email", () => sendLeadQuotationEmail(quote.id))
                    }
                  >
                    Email
                  </button>
                  {quote.status !== "REVISED" ? (
                    <button
                      type="button"
                      className="leads-action-btn"
                      disabled={pending}
                      onClick={() =>
                        runAction("Revision", async () => {
                          const result = await reviseLeadQuotation(quote.id);
                          if (result.ok && result.quotationId) {
                            setPreviewId(result.quotationId);
                          }
                          return result;
                        })
                      }
                    >
                      Revise
                    </button>
                  ) : null}
                  {quote.shareToken ? (
                    <Link
                      className="leads-action-btn"
                      href={`/quotation/${quote.shareToken}`}
                      target="_blank"
                    >
                      Share link
                    </Link>
                  ) : null}
                </div>
              ) : quote.shareToken ? (
                <div className="leads-quote-secondary-actions">
                  <Link
                    className="leads-action-btn"
                    href={`/quotation/${quote.shareToken}`}
                    target="_blank"
                  >
                    Share link
                  </Link>
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {previewQuote ? (
        <div className="leads-quote-preview">
          <div className="leads-quote-preview-head">
            <strong>Preview — {previewQuote.quotationNumber}</strong>
            <div className="leads-quote-preview-head-actions">
              <Link
                className="btn-secondary btn-sm"
                href={`/app/leads/quotations/${previewQuote.id}/print`}
                target="_blank"
              >
                Open PDF
              </Link>
              {isLocked(previewQuote) ? (
                <span className="leads-quote-locked-pill">Locked after advance payment</span>
              ) : null}
            </div>
          </div>
          <div className="leads-quote-preview-body">
            <QuotationPrintView
              organizationName={organizationName}
              logoUrl={organizationLogoUrl}
              embed
              quotation={{
                quotationNumber: previewQuote.quotationNumber,
                requestType: previewQuote.requestType,
                status: previewQuote.status,
                revisionNumber: previewQuote.revisionNumber,
                quotationDate: previewQuote.quotationDate,
                projectStartDate: previewQuote.projectStartDate,
                endDate: previewQuote.endDate,
                durationDays: previewQuote.durationDays,
                company: previewQuote.company ?? billCompany,
                address: previewQuote.address ?? billAddress,
                zipCode: previewQuote.zipCode ?? billZip,
                scopeNotes: previewQuote.scopeNotes ?? scopeNotes,
                paymentTerms: previewQuote.paymentTerms ?? paymentTerms,
                advanceRequired: previewQuote.advanceRequired
                  ? Number(previewQuote.advanceRequired)
                  : null,
                notes: previewQuote.notes,
                lockedAt: previewQuote.lockedAt,
                subtotal: Number(previewQuote.subtotal),
                totalAmount: Number(previewQuote.totalAmount),
                lines: previewQuote.lines.map((line) => ({
                  serviceCategory: line.serviceCategory,
                  subCategory: line.subCategory,
                  quantity: line.quantity,
                  unitPrice: Number(line.unitPrice),
                  lineTotal: Number(line.lineTotal),
                })),
                lead: {
                  name: leadName,
                  phone: leadPhone,
                  email: leadEmail,
                  company: leadCompany,
                  address: leadAddress,
                  zipCode: leadZipCode,
                  requirement: leadRequirement,
                },
              }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
