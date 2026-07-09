"use client";

import type { ReactNode } from "react";
import { siteBrand } from "@/app/site-content";
import type { DispatchSlipData } from "@/lib/leads/sales-order-types";

export function DispatchSlipView({
  slip,
  toolbar,
}: {
  slip: DispatchSlipData;
  toolbar?: ReactNode;
}) {
  const logoSrc = slip.organization.logoUrl ?? siteBrand.logoSrc;

  return (
    <div className="dispatch-slip-page">
      {toolbar}
      <article className="dispatch-slip-sheet">
        <header className="dispatch-slip-header">
          <div className="dispatch-slip-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="" className="dispatch-slip-logo" />
            <div>
              <h1>{slip.organization.name}</h1>
              <p>Dispatch slip</p>
            </div>
          </div>
          <div className="dispatch-slip-meta">
            <p>
              <strong>Slip #</strong> {slip.slipNumber}
            </p>
            <p>
              <strong>SO #</strong> {slip.orderNumber}
            </p>
            <p>
              <strong>Date</strong>{" "}
              {new Date(slip.dispatchDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </header>

        <section className="dispatch-slip-party">
          <h2>Ship to</h2>
          <p className="dispatch-slip-customer-name">{slip.customerName}</p>
          {slip.customerCompany ? <p>{slip.customerCompany}</p> : null}
          {slip.customerAddress ? <p>{slip.customerAddress}</p> : null}
          {slip.customerPhone ? <p>{slip.customerPhone}</p> : null}
        </section>

        <table className="dispatch-slip-lines">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Description</th>
              <th scope="col">Qty</th>
              <th scope="col">Unit</th>
            </tr>
          </thead>
          <tbody>
            {slip.lines.length === 0 ? (
              <tr>
                <td colSpan={4}>No line items recorded.</td>
              </tr>
            ) : (
              slip.lines.map((line, index) => (
                <tr key={`${line.description}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{line.description}</td>
                  <td>{line.quantity}</td>
                  <td>{line.unit ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <dl className="dispatch-slip-logistics">
          {slip.transportMode ? (
            <div>
              <dt>Transport</dt>
              <dd>{slip.transportMode}</dd>
            </div>
          ) : null}
          {slip.lrNumber ? (
            <div>
              <dt>LR / AWB</dt>
              <dd>{slip.lrNumber}</dd>
            </div>
          ) : null}
          {slip.boxes != null ? (
            <div>
              <dt>Boxes</dt>
              <dd>{slip.boxes}</dd>
            </div>
          ) : null}
          {slip.weightKg != null ? (
            <div>
              <dt>Weight</dt>
              <dd>{slip.weightKg} kg</dd>
            </div>
          ) : null}
        </dl>

        {slip.notes ? (
          <section className="dispatch-slip-notes">
            <h2>Notes</h2>
            <p>{slip.notes}</p>
          </section>
        ) : null}

        <footer className="dispatch-slip-footer">
          <p>Goods dispatched as per above. Please verify on receipt.</p>
        </footer>
      </article>
    </div>
  );
}
