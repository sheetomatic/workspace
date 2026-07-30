"use client";

import { useActionState } from "react";
import { PackageCheck } from "lucide-react";
import {
  markTemplatePaymentReceivedAction,
  saveTemplateProductAction,
  type TemplateOrderActionState,
} from "@/app/app/template-orders/actions";
import { formatPendingAge } from "@/lib/workspace-format";

export type TemplateOrderRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  paymentRef: string | null;
  paymentClaimedAt: string | null;
  hasPaymentProof: boolean;
  status: "PENDING" | "PAYMENT_RECEIVED" | "FULFILLED" | "CANCELLED";
  createdAt: string;
  product: {
    name: string;
    type: "APPSHEET" | "SHEETS" | "EXCEL";
    priceInr: number;
    hasCopyLink: boolean;
  };
};

export type TemplateProductRow = {
  id: string;
  slug: string;
  name: string;
  type: "APPSHEET" | "SHEETS" | "EXCEL";
  priceInr: number;
  description: string | null;
  copyLink: string | null;
  active: boolean;
  sortOrder: number;
};

const initialState: TemplateOrderActionState = { ok: false, message: "" };

function typeLabel(type: TemplateOrderRow["product"]["type"]) {
  if (type === "APPSHEET") return "AppSheet";
  if (type === "SHEETS") return "Sheets";
  return "Excel";
}

export function TemplateOrdersPanel({
  orders,
  products,
}: {
  orders: TemplateOrderRow[];
  products: TemplateProductRow[];
}) {
  const [payState, payAction, payPending] = useActionState(
    markTemplatePaymentReceivedAction,
    initialState,
  );
  const [productState, productAction, productPending] = useActionState(
    saveTemplateProductAction,
    initialState,
  );

  const pending = orders.filter((row) => row.status === "PENDING");
  const recent = orders.filter((row) => row.status !== "PENDING").slice(0, 12);

  return (
    <div className="ws-sf-stack">
      <section className="ws-sf-list-view" aria-label="Template orders">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <PackageCheck size={18} aria-hidden />
            <h2>Template orders</h2>
            <span className="ws-sf-list-view-count">{pending.length}</span>
          </div>
          <p className="ws-em-section-lead">
            Verify UPI payment, then click <strong>Payment received</strong>. We
            email the AppSheet / Sheets copy link automatically and mark the
            order fulfilled. Copy links are never shown on the public catalog.
          </p>
        </header>

        {payState.message ? (
          <p
            className={
              payState.ok ? "saas-form-message ok" : "saas-form-message error"
            }
          >
            {payState.message}
          </p>
        ) : null}

        {pending.length === 0 ? (
          <div className="ws-empty-state">
            <p>No template orders waiting for payment confirmation.</p>
          </div>
        ) : (
          <div className={`saas-list-card ${payPending ? "is-updating" : ""}`}>
            {pending.map((row) => (
              <article className="saas-list-row" key={row.id}>
                <div className="saas-list-icon" aria-hidden />
                <div className="saas-list-body">
                  <h3>
                    {row.product.name}{" "}
                    <span style={{ fontWeight: 500, color: "#64748b" }}>
                      ({typeLabel(row.product.type)})
                    </span>
                  </h3>
                  <p>
                    {row.customerName} · {row.customerEmail}
                    {row.customerPhone ? ` · ${row.customerPhone}` : ""} · ₹
                    {row.product.priceInr.toLocaleString("en-IN")} · submitted{" "}
                    {formatPendingAge(new Date(row.createdAt))}
                  </p>
                  {row.paymentRef ? <p>Ref: {row.paymentRef}</p> : null}
                  {row.paymentClaimedAt ? (
                    <p>
                      Buyer marked paid{" "}
                      {formatPendingAge(new Date(row.paymentClaimedAt))}
                      {row.hasPaymentProof ? (
                        <>
                          {" · "}
                          <a
                            href={`/api/templates/order/${row.id}/proof`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View proof
                          </a>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  {!row.product.hasCopyLink ? (
                    <p className="saas-form-message error">
                      Add copy link on the product before confirming.
                    </p>
                  ) : null}
                </div>
                <form action={payAction} className="saas-list-actions">
                  <input name="orderId" type="hidden" value={row.id} />
                  <button
                    type="submit"
                    className="saas-btn primary"
                    disabled={payPending || !row.product.hasCopyLink}
                  >
                    Payment received
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}

        {recent.length > 0 ? (
          <div style={{ marginTop: "1.25rem" }}>
            <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
              Recently fulfilled
            </h3>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#475569" }}>
              {recent.map((row) => (
                <li key={row.id}>
                  {row.customerName} — {row.product.name} ({row.status})
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="ws-sf-list-view" aria-label="Template products">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Products & copy links</h2>
            <span className="ws-sf-list-view-count">{products.length}</span>
          </div>
          <p className="ws-em-section-lead">
            Paste the private AppSheet copy URL or Google Sheet master link here.
            Public /templates never receives this field.
          </p>
        </header>

        {productState.message ? (
          <p
            className={
              productState.ok
                ? "saas-form-message ok"
                : "saas-form-message error"
            }
          >
            {productState.message}
          </p>
        ) : null}

        <div className={`saas-list-card ${productPending ? "is-updating" : ""}`}>
          {products.map((product) => (
            <article className="saas-list-row" key={product.id}>
              <form
                action={productAction}
                style={{
                  display: "grid",
                  gap: 8,
                  width: "100%",
                  gridTemplateColumns: "1fr",
                }}
              >
                <input name="id" type="hidden" value={product.id} />
                <input name="slug" type="hidden" value={product.slug} />
                <input name="type" type="hidden" value={product.type} />
                <input name="sortOrder" type="hidden" value={product.sortOrder} />
                <div className="saas-list-body">
                  <h3>
                    {product.name}{" "}
                    <span style={{ fontWeight: 500, color: "#64748b" }}>
                      ({typeLabel(product.type)})
                    </span>
                  </h3>
                  <label style={{ display: "block", fontSize: 12 }}>
                    Display name
                    <input
                      name="name"
                      defaultValue={product.name}
                      required
                      style={{ width: "100%", marginTop: 4 }}
                    />
                  </label>
                  <label style={{ display: "block", fontSize: 12 }}>
                    Price (INR)
                    <input
                      name="priceInr"
                      type="number"
                      min={0}
                      defaultValue={product.priceInr}
                      required
                      style={{ width: "100%", marginTop: 4 }}
                    />
                  </label>
                  <label style={{ display: "block", fontSize: 12 }}>
                    Description
                    <textarea
                      name="description"
                      defaultValue={product.description ?? ""}
                      rows={2}
                      style={{ width: "100%", marginTop: 4 }}
                    />
                  </label>
                  <label style={{ display: "block", fontSize: 12 }}>
                    Copy link (private)
                    <input
                      name="copyLink"
                      type="url"
                      placeholder="https://www.appsheet.com/template/..."
                      defaultValue={product.copyLink ?? ""}
                      style={{ width: "100%", marginTop: 4 }}
                    />
                  </label>
                  <label
                    style={{
                      display: "inline-flex",
                      gap: 8,
                      alignItems: "center",
                      fontSize: 12,
                    }}
                  >
                    <input
                      name="active"
                      type="checkbox"
                      defaultChecked={product.active}
                    />
                    Active on /templates
                  </label>
                </div>
                <div className="saas-list-actions">
                  <button
                    type="submit"
                    className="saas-btn primary"
                    disabled={productPending}
                  >
                    Save
                  </button>
                </div>
              </form>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
