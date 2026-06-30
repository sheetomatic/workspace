"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { QuotationRequestType, QuotationStatus } from "@prisma/client";
import {
  createLeadQuotation,
  reviseLeadQuotation,
  sendLeadQuotationEmail,
  sendLeadQuotationWhatsApp,
} from "@/app/app/leads/actions";
import { formatInr } from "@/lib/leads/categories";
import {
  DEFAULT_QUOTATION_PAYMENT_TERMS,
  quotationStatusLabel,
} from "@/lib/leads/quotation-content";

type CatalogItem = {
  id: string;
  serviceCategory: string;
  subCategory: string;
  unitPrice: string | number | null;
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
  quotationDate: string;
  sentAt: string | null;
  lockedAt: string | null;
  shareToken: string | null;
  lines: QuotationLine[];
};

type OfferedServiceRow = {
  id: string;
  serviceCategory: string;
  subCategory: string;
  unitPrice: string | number | null;
  catalogId: string | null;
};

export function QuotationBuilderPanel({
  leadId,
  leadName,
  leadCompany,
  leadAddress,
  leadZipCode,
  leadRequirement,
  offeredServices,
  serviceCatalog,
  quotations,
  canManage,
  pending,
  startTransition,
}: {
  leadId: string;
  leadName: string | null;
  leadCompany: string | null;
  leadAddress: string | null;
  leadZipCode: string | null;
  leadRequirement: string | null;
  offeredServices: OfferedServiceRow[];
  serviceCatalog: CatalogItem[];
  quotations: QuotationRow[];
  canManage: boolean;
  pending: boolean;
  startTransition: (callback: () => Promise<void>) => void;
}) {
  const [quoteType, setQuoteType] = useState<QuotationRequestType>("PROPOSAL");
  const [quoteDuration, setQuoteDuration] = useState("30");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [scopeNotes, setScopeNotes] = useState(leadRequirement ?? "");
  const [paymentTerms, setPaymentTerms] = useState(DEFAULT_QUOTATION_PAYMENT_TERMS);
  const [advanceRequired, setAdvanceRequired] = useState("");
  const [billCompany, setBillCompany] = useState(leadCompany ?? "");
  const [billAddress, setBillAddress] = useState(leadAddress ?? "");
  const [billZip, setBillZip] = useState(leadZipCode ?? "");
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(
    quotations[0]?.id ?? null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const offeredCatalogIds = useMemo(
    () =>
      offeredServices
        .map((item) => item.catalogId)
        .filter((id): id is string => Boolean(id)),
    [offeredServices],
  );

  const lineIdsForCreate =
    selectedLineIds.length > 0 ? selectedLineIds : offeredCatalogIds;

  const estimatedTotal = useMemo(() => {
    const ids = new Set(lineIdsForCreate);
    return serviceCatalog
      .filter((item) => ids.has(item.id))
      .reduce((sum, item) => sum + Number(item.unitPrice ?? 0), 0);
  }, [lineIdsForCreate, serviceCatalog]);

  const previewQuote = quotations.find((item) => item.id === previewId) ?? null;
  const isLocked = (quote: QuotationRow) =>
    quote.status === "LOCKED" || Boolean(quote.lockedAt);

  function toggleLine(catalogId: string) {
    setSelectedLineIds((current) =>
      current.includes(catalogId)
        ? current.filter((id) => id !== catalogId)
        : [...current, catalogId],
    );
  }

  function runAction(label: string, action: () => Promise<{ ok: boolean; message?: string }>) {
    setActionMessage(null);
    startTransition(async () => {
      const result = await action();
      setActionMessage(result.ok ? `${label} done.` : result.message ?? `${label} failed.`);
    });
  }

  return (
    <section className="leads-drawer-section leads-quotation-workspace">
      <h3>Quotation / Invoice</h3>

      {canManage ? (
        <div className="leads-drawer-form leads-quote-builder">
          <label>
            Type
            <select
              value={quoteType}
              onChange={(e) => setQuoteType(e.target.value as QuotationRequestType)}
            >
              <option value="PROPOSAL">Proposal</option>
              <option value="INVOICE">Invoice</option>
            </select>
          </label>
          <label>
            Duration (days)
            <input
              type="number"
              value={quoteDuration}
              onChange={(e) => setQuoteDuration(e.target.value)}
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
              placeholder="e.g. 50% of total"
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
            {offeredServices.length === 0 && serviceCatalog.length === 0 ? (
              <p className="leads-machine-muted">Add services on the Services tab first.</p>
            ) : (
              <ul className="leads-quote-line-picker">
                {(offeredServices.length > 0
                  ? offeredServices.map((item) => {
                      const catalogMatch = serviceCatalog.find(
                        (c) => c.id === item.catalogId,
                      );
                      const catalogId = item.catalogId ?? catalogMatch?.id;
                      if (!catalogId) {
                        return null;
                      }
                      return (
                        <li key={item.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={
                                selectedLineIds.length === 0 ||
                                selectedLineIds.includes(catalogId)
                              }
                              onChange={() => toggleLine(catalogId)}
                            />
                            <span>
                              {item.serviceCategory} — {item.subCategory}
                              {item.unitPrice
                                ? ` (${formatInr(Number(item.unitPrice))})`
                                : ""}
                            </span>
                          </label>
                        </li>
                      );
                    })
                  : serviceCatalog.map((item) => (
                      <li key={item.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedLineIds.includes(item.id)}
                            onChange={() => toggleLine(item.id)}
                          />
                          <span>
                            {item.serviceCategory} — {item.subCategory}
                            {item.unitPrice
                              ? ` (${formatInr(Number(item.unitPrice))})`
                              : ""}
                          </span>
                        </label>
                      </li>
                    ))
                ).filter(Boolean)}
              </ul>
            )}
            {estimatedTotal > 0 ? (
              <p className="leads-quote-estimate">
                Estimated total: <strong>{formatInr(estimatedTotal)}</strong>
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="btn-primary leads-form-span-2"
            disabled={pending || lineIdsForCreate.length === 0}
            onClick={() =>
              runAction("Generate", async () => {
                const result = await createLeadQuotation({
                  leadId,
                  requestType: quoteType,
                  durationDays: quoteDuration,
                  notes: quoteNotes,
                  scopeNotes,
                  paymentTerms,
                  advanceRequired,
                  company: billCompany,
                  address: billAddress,
                  zipCode: billZip,
                  lineCatalogIds: lineIdsForCreate,
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
              <button
                type="button"
                className="leads-quote-select"
                onClick={() => setPreviewId(quote.id)}
              >
                <strong>{quote.quotationNumber}</strong>
                <span>
                  {quote.requestType} · {formatInr(Number(quote.totalAmount))}
                  {quote.revisionNumber > 1 ? ` · R${quote.revisionNumber}` : ""}
                </span>
                <em className={`leads-quote-status leads-quote-status-${quote.status.toLowerCase()}`}>
                  {quotationStatusLabel(quote.status)}
                </em>
              </button>
              <div className="leads-quote-actions">
                <Link
                  className="leads-action-btn"
                  href={`/app/leads/quotations/${quote.id}/print`}
                  target="_blank"
                >
                  PDF
                </Link>
                {canManage && !isLocked(quote) ? (
                  <>
                    <button
                      type="button"
                      className="leads-action-btn"
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
                      WA
                    </button>
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
                  </>
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
            </li>
          ))
        )}
      </ul>

      {previewQuote ? (
        <div className="leads-quote-preview">
          <div className="leads-quote-preview-head">
            <strong>Preview — {previewQuote.quotationNumber}</strong>
            {isLocked(previewQuote) ? (
              <span className="leads-quote-locked-pill">Locked after advance payment</span>
            ) : null}
          </div>
          <iframe
            title={`Quotation ${previewQuote.quotationNumber}`}
            src={`/app/leads/quotations/${previewQuote.id}/print?embed=1`}
            className="leads-quote-preview-frame"
          />
        </div>
      ) : null}
    </section>
  );
}
