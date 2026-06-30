"use client";

import type { ReactNode } from "react";

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
  formatInr,
}: {
  organizationName: string;
  logoUrl: string | null;
  quotation: {
    quotationNumber: string;
    requestType: string;
    quotationDate: string;
    projectStartDate: string | null;
    endDate: string | null;
    durationDays: number | null;
    company: string | null;
    address: string | null;
    zipCode: string | null;
    notes: string | null;
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
  formatInr: (value: number) => string;
}) {
  const clientName = quotation.lead.name || "Client";
  const clientCompany = quotation.company || quotation.lead.company || "—";
  const clientAddress = quotation.address || quotation.lead.address || "—";
  const clientZip = quotation.zipCode || quotation.lead.zipCode || "—";

  return (
    <div className="quotation-print-page">
      {toolbar}
      <article className="quotation-print-sheet">
        <header className="quotation-print-header">
          <div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={organizationName} className="quotation-print-logo" />
            ) : (
              <h1>{organizationName}</h1>
            )}
            <p>Professional automation · Google Sheets · WhatsApp API · AppSheet</p>
          </div>
          <div className="quotation-print-meta">
            <h2>{quotation.requestType === "INVOICE" ? "Tax Invoice" : "Quotation"}</h2>
            <p>
              <strong>{quotation.quotationNumber}</strong>
            </p>
            <p>Date: {new Date(quotation.quotationDate).toLocaleDateString("en-IN")}</p>
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

        {quotation.lead.requirement ? (
          <section className="quotation-print-scope">
            <h3>Scope / Requirement</h3>
            <p>{quotation.lead.requirement}</p>
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
          </tfoot>
        </table>

        <section className="quotation-print-timeline">
          <p>
            Project start:{" "}
            {quotation.projectStartDate
              ? new Date(quotation.projectStartDate).toLocaleDateString("en-IN")
              : "—"}
          </p>
          <p>Duration: {quotation.durationDays ? `${quotation.durationDays} days` : "—"}</p>
          <p>
            End date:{" "}
            {quotation.endDate
              ? new Date(quotation.endDate).toLocaleDateString("en-IN")
              : "—"}
          </p>
        </section>

        {quotation.notes ? (
          <section className="quotation-print-notes">
            <h3>Notes</h3>
            <p>{quotation.notes}</p>
          </section>
        ) : null}

        <footer className="quotation-print-footer">
          <p>Thank you for choosing {organizationName}.</p>
          <p>
            This document is computer-generated. For queries, reply on WhatsApp or email
            sheetomatic@gmail.com
          </p>
        </footer>
      </article>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff;
          }
        }
        .quotation-print-page {
          min-height: 100vh;
          background: #f8fafc;
          padding: 1rem;
        }
        .quotation-print-toolbar {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .quotation-print-sheet {
          max-width: 900px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 2rem;
        }
        .quotation-print-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 1rem;
          margin-bottom: 1.25rem;
        }
        .quotation-print-logo {
          max-height: 48px;
        }
        .quotation-print-meta {
          text-align: right;
        }
        .quotation-print-client,
        .quotation-print-scope,
        .quotation-print-timeline,
        .quotation-print-notes {
          margin-bottom: 1rem;
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
        .quotation-print-footer {
          margin-top: 2rem;
          font-size: 0.82rem;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
