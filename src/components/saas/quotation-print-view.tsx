"use client";

import type { ReactNode } from "react";
import { formatInr } from "@/lib/leads/categories";
import { formatInrInWords } from "@/lib/inr-words";
import {
  QUOTATION_FOOTER_CONTACT,
  formatQuotationProjectDate,
  formatQuotationTermsBlock,
  quotationTermsForRequestType,
} from "@/lib/leads/quotation-content";
import { siteBrand } from "@/app/site-content";

type QuotationLine = {
  serviceCategory: string;
  subCategory: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export function QuotationPrintView({
  organizationName,
  logoUrl,
  quotation,
  toolbar,
  embed = false,
}: {
  organizationName: string;
  logoUrl: string | null;
  quotation: {
    quotationNumber: string;
    requestType: string;
    status?: string;
    revisionNumber?: number;
    quotationDate: string;
    projectStartDate: string | null;
    endDate: string | null;
    durationDays: number | null;
    company: string | null;
    address: string | null;
    zipCode: string | null;
    scopeNotes: string | null;
    paymentTerms: string | null;
    advanceRequired: number | null;
    notes: string | null;
    lockedAt: string | null;
    subtotal: number;
    totalAmount: number;
    lines: QuotationLine[];
    lead: {
      name: string | null;
      phone: string | null;
      email: string | null;
      company: string | null;
      address: string | null;
      zipCode: string | null;
      requirement: string | null;
    };
  };
  toolbar?: ReactNode;
  embed?: boolean;
}) {
  const clientName = quotation.lead.name || "Client";
  const clientCompany = quotation.company || quotation.lead.company || "—";
  const clientAddress = quotation.address || quotation.lead.address || "—";
  const clientZip = quotation.zipCode || quotation.lead.zipCode || "—";
  const scopeText =
    quotation.scopeNotes || quotation.lead.requirement || null;
  const isLocked = quotation.status === "LOCKED" || Boolean(quotation.lockedAt);
  const revisionLabel =
    quotation.revisionNumber && quotation.revisionNumber > 1
      ? ` · Revision ${quotation.revisionNumber}`
      : "";
  const brandLogoSrc = logoUrl ?? siteBrand.logoSrc;

  return (
    <div className={`quotation-print-page${embed ? " quotation-print-embed" : ""}`}>
      {toolbar}
      <article className="quotation-print-sheet">
        {isLocked ? (
          <div className="quotation-print-locked-banner">
            Approved · Locked after advance payment
          </div>
        ) : null}

        <header className="quotation-print-header">
          <div className="quotation-print-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brandLogoSrc}
              alt={organizationName}
              className="quotation-print-logo"
            />
          </div>
          <div className="quotation-print-meta">
            <h2>{quotation.requestType === "INVOICE" ? "Tax Invoice" : "Quotation / Proposal"}</h2>
            <p>
              <strong>
                {quotation.quotationNumber}
                {revisionLabel}
              </strong>
            </p>
            <p>
              {quotation.requestType === "INVOICE"
                ? "Invoice Generated Date"
                : "Quotation Generated Date"}
              : {new Date(quotation.quotationDate).toLocaleDateString("en-IN")}
            </p>
          </div>
        </header>

        <section className="quotation-print-client">
          <h3>Bill To</h3>
          <p>
            <strong>{clientName}</strong>
          </p>
          <p>{clientCompany}</p>
          <p>{clientAddress}</p>
          <p>ZIP: {clientZip}</p>
          {quotation.lead.phone ? <p>Phone: {quotation.lead.phone}</p> : null}
          {quotation.lead.email ? <p>Email: {quotation.lead.email}</p> : null}
        </section>

        {scopeText ? (
          <section className="quotation-print-scope">
            <h3>Scope / Requirement</h3>
            <p>{scopeText}</p>
          </section>
        ) : null}

        <table className="quotation-print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Service category</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate (₹)</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {quotation.lines.map((line, index) => (
              <tr key={`${line.serviceCategory}-${line.subCategory}-${index}`}>
                <td>{index + 1}</td>
                <td>{line.serviceCategory}</td>
                <td>{line.subCategory}</td>
                <td>{line.quantity}</td>
                <td>{line.unitPrice.toLocaleString("en-IN")}</td>
                <td>{line.lineTotal.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>Subtotal</td>
              <td>{formatInr(quotation.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={5}>
                <strong>Total</strong>
              </td>
              <td>
                <strong>{formatInr(quotation.totalAmount)}</strong>
              </td>
            </tr>
            <tr className="quotation-print-total-words">
              <td colSpan={6}>
                <strong>Amount in words:</strong> {formatInrInWords(quotation.totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>

        <section className="quotation-print-timeline">
          <p>
            Project start: {formatQuotationProjectDate(quotation.projectStartDate)}
          </p>
          <p>
            Duration:{" "}
            {quotation.durationDays != null ? `${quotation.durationDays} days` : "—"}
          </p>
          <p>End date: {formatQuotationProjectDate(quotation.endDate)}</p>
          {quotation.advanceRequired ? (
            <p>
              Advance required: <strong>{formatInr(quotation.advanceRequired)}</strong>
            </p>
          ) : null}
        </section>

        {quotation.paymentTerms ? (
          <section className="quotation-print-notes">
            <h3>Payment terms</h3>
            <p>{quotation.paymentTerms}</p>
          </section>
        ) : null}

        {quotation.notes ? (
          <section className="quotation-print-notes">
            <h3>Notes</h3>
            <p>{quotation.notes}</p>
          </section>
        ) : null}

        <section className="quotation-print-terms">
          <h3>Terms &amp; conditions</h3>
          <pre>
            {formatQuotationTermsBlock(
              quotationTermsForRequestType(quotation.requestType),
            )}
          </pre>
          <p className="quotation-print-terms-link">
            Full terms: sheetomatic.com/terms
          </p>
        </section>

        <footer className="quotation-print-footer">
          <p>Thank you for choosing {organizationName}.</p>
          <p>{QUOTATION_FOOTER_CONTACT}</p>
        </footer>
      </article>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
          .quotation-print-standalone {
            background: #fff !important;
            padding: 0 !important;
          }
        }
        .quotation-print-page {
          min-height: 100vh;
          background: #f8fafc;
          padding: 1rem;
        }
        .quotation-print-page.quotation-print-embed {
          min-height: auto;
          background: #fff;
          padding: 0;
        }
        .quotation-print-embed .quotation-print-sheet {
          border: none;
          border-radius: 0;
          padding: 1rem;
        }
        .quotation-print-toolbar {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .quotation-print-sheet {
          max-width: 900px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 2rem;
        }
        .quotation-print-locked-banner {
          background: #ecfdf5;
          border: 1px solid #6ee7b7;
          color: #047857;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-weight: 600;
          font-size: 0.88rem;
        }
        .quotation-print-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 1rem;
          margin-bottom: 1.25rem;
        }
        .quotation-print-brand {
          display: flex;
          align-items: center;
          min-width: 0;
          flex: 1 1 auto;
        }
        .quotation-print-logo {
          display: block;
          height: 40px;
          width: auto;
          max-width: min(260px, 100%);
          object-fit: contain;
          object-position: left center;
        }
        .quotation-print-meta {
          text-align: right;
          flex: 0 0 auto;
        }
        .quotation-print-client,
        .quotation-print-scope,
        .quotation-print-timeline {
          margin-bottom: 1rem;
          font-size: 0.95rem;
          line-height: 1.65;
        }
        .quotation-print-timeline p {
          margin: 0;
        }
        .quotation-print-notes,
        .quotation-print-terms {
          margin-bottom: 1rem;
        }
        .quotation-print-terms pre {
          white-space: pre-wrap;
          font-family: inherit;
          font-size: 0.82rem;
          color: #475569;
          margin: 0;
        }
        .quotation-print-terms-link {
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 0.5rem;
        }
        .quotation-print-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        .quotation-print-table th,
        .quotation-print-table td {
          border: 1px solid #cbd5e1;
          padding: 0.5rem 0.65rem;
          font-size: 0.9rem;
        }
        .quotation-print-table th {
          background: #0f766e;
          color: #fff;
        }
        .quotation-print-total-words td {
          font-size: 0.86rem;
          color: #334155;
          background: #f8fafc;
        }
        .quotation-print-footer {
          margin-top: 2rem;
          font-size: 0.82rem;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
