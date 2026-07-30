"use client";

import { useMemo, useState } from "react";
import {
  SHEETOMATIC_UPI_PAYMENT,
  buildUpiPayUrl,
  isMobileDevice,
  openPhonePePayment,
} from "@/lib/payments/upi-phonepe";
import "./templates-store.css";

export type PublicTemplateProduct = {
  id: string;
  slug: string;
  name: string;
  type: "APPSHEET" | "SHEETS" | "EXCEL";
  priceInr: number;
  description: string | null;
  thumbnailUrl: string | null;
};

type Step = "catalog" | "details" | "pay";

function typeLabel(type: PublicTemplateProduct["type"]) {
  if (type === "APPSHEET") return "AppSheet";
  if (type === "SHEETS") return "Google Sheets";
  return "Excel";
}

export function TemplatesStoreContent({
  products,
}: {
  products: PublicTemplateProduct[];
}) {
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const [step, setStep] = useState<Step>("catalog");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [requirement, setRequirement] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId],
  );

  async function submitOrder() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/templates/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selected.id,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          company: company || undefined,
          city: city || undefined,
          requirement: requirement || undefined,
          paymentRef: paymentRef || undefined,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        orderId?: string;
        error?: string;
      };
      if (!response.ok || !data.ok || !data.orderId) {
        setError(data.error ?? "Could not save order. Try WhatsApp us.");
        return;
      }
      setOrderId(data.orderId);
      setStep("pay");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function payNow() {
    if (!selected) return;
    const note = `Template ${selected.slug}`.slice(0, 80);
    if (isMobileDevice()) {
      openPhonePePayment({
        upiId: SHEETOMATIC_UPI_PAYMENT.upiId,
        payeeName: SHEETOMATIC_UPI_PAYMENT.payeeName,
        amount: selected.priceInr,
        note,
      });
      return;
    }
    window.location.href = buildUpiPayUrl({
      upiId: SHEETOMATIC_UPI_PAYMENT.upiId,
      payeeName: SHEETOMATIC_UPI_PAYMENT.payeeName,
      amount: selected.priceInr,
      note,
    });
  }

  return (
    <div className="tpl-page">
      <header className="tpl-hero">
        <p className="tpl-eyebrow">Smart Office Templates</p>
        <h1>Google Sheets & AppSheet templates</h1>
        <p className="tpl-lead">
          Add to cart → share your details → pay UPI. We confirm in CRM Leads,
          then email your private Make a copy link.
        </p>
      </header>

      <div className="tpl-layout">
        <section className="tpl-catalog" aria-label="Catalog">
          {products.length === 0 ? (
            <p>No templates listed yet.</p>
          ) : (
            <ul className="tpl-product-list">
              {products.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    className={
                      product.id === selectedId
                        ? "tpl-card is-selected"
                        : "tpl-card"
                    }
                    onClick={() => {
                      setSelectedId(product.id);
                      setStep("catalog");
                      setOrderId(null);
                      setError(null);
                    }}
                  >
                    {product.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="tpl-thumb"
                        src={product.thumbnailUrl}
                        alt=""
                        width={120}
                        height={120}
                      />
                    ) : (
                      <span className="tpl-thumb tpl-thumb-empty" aria-hidden />
                    )}
                    <span className="tpl-card-body">
                      <span className="tpl-card-name">{product.name}</span>
                      <span className="tpl-card-meta">
                        {typeLabel(product.type)} · ₹
                        {product.priceInr.toLocaleString("en-IN")}
                      </span>
                      {product.description ? (
                        <span className="tpl-card-desc">
                          {product.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="tpl-checkout" aria-label="Checkout">
          {!selected ? (
            <p>Select a template to continue.</p>
          ) : step === "pay" && orderId ? (
            <div className="tpl-done">
              <h2>Pay ₹{selected.priceInr.toLocaleString("en-IN")}</h2>
              <p>
                Order saved. Pay on UPI now. Our team confirms in CRM → Leads,
                then emails your Make a copy link to <strong>{email}</strong>.
              </p>
              <p className="tpl-order-id">Order ID: {orderId}</p>
              <button type="button" className="tpl-btn primary" onClick={payNow}>
                Open UPI / PhonePe
              </button>
              <div className="tpl-qr-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={SHEETOMATIC_UPI_PAYMENT.qrImageSrc}
                  alt="PhonePe UPI QR"
                  width={180}
                  height={180}
                />
                <p>
                  UPI: <code>{SHEETOMATIC_UPI_PAYMENT.upiId}</code>
                </p>
              </div>
            </div>
          ) : step === "details" ? (
            <form
              className="tpl-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submitOrder();
              }}
            >
              <h2>Your details</h2>
              <p className="tpl-price">
                {selected.name} · ₹{selected.priceInr.toLocaleString("en-IN")}
              </p>
              <label>
                Full name *
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </label>
              <label>
                Email * (copy link arrives here)
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                WhatsApp / phone *
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                />
              </label>
              <label>
                Company
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoComplete="organization"
                />
              </label>
              <label>
                City
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoComplete="address-level2"
                />
              </label>
              <label>
                Requirement / notes
                <input
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  placeholder="How you plan to use this template"
                />
              </label>
              <label>
                UPI reference (optional)
                <input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="UTR or last 4 digits after paying"
                />
              </label>
              {error ? <p className="tpl-error">{error}</p> : null}
              <div className="tpl-form-actions">
                <button
                  type="button"
                  className="tpl-btn"
                  onClick={() => setStep("catalog")}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="tpl-btn primary"
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Continue to payment"}
                </button>
              </div>
            </form>
          ) : (
            <div className="tpl-form">
              <h2>{selected.name}</h2>
              {selected.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="tpl-checkout-thumb"
                  src={selected.thumbnailUrl}
                  alt=""
                  width={280}
                  height={280}
                />
              ) : null}
              <p className="tpl-price">
                ₹{selected.priceInr.toLocaleString("en-IN")}
              </p>
              {selected.description ? (
                <p className="tpl-fine">{selected.description}</p>
              ) : null}
              <button
                type="button"
                className="tpl-btn primary"
                onClick={() => setStep("details")}
              >
                Add to cart
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
