"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildWhatsAppUrl, whatsappDisplayNumber } from "@/app/site-content";
import { marketingButtonClass } from "@/components/marketing/marketing-button-class";
import { WhatsAppIcon } from "@/components/marketing/marketing-icons";
import {
  CLOUD_SOFTWARES_ANCHOR,
  TEMPLATE_STORE_CATEGORIES,
  type TemplateStoreCategoryId,
  templateTypeToCategory,
} from "@/lib/templates/categories";
import type { CloudSoftwareProduct } from "@/lib/templates/cloud-softwares";
import {
  SHEETOMATIC_UPI_PAYMENT,
  buildUpiPayUrl,
  isMobileDevice,
  openPhonePePayment,
} from "@/lib/payments/upi-phonepe";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
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
type CategoryFilter = TemplateStoreCategoryId | "all";
type Selection =
  | { kind: "template"; id: string }
  | { kind: "cloud"; id: string };

function typeLabel(type: PublicTemplateProduct["type"]) {
  if (type === "APPSHEET") return "AppSheet";
  if (type === "SHEETS") return "Google Sheets";
  return "Excel";
}

function selectionFromCategory(
  category: CategoryFilter,
  products: PublicTemplateProduct[],
  cloudProducts: CloudSoftwareProduct[],
): Selection | null {
  if (category === "cloud" || (category === "all" && products.length === 0)) {
    const first = cloudProducts[0];
    return first ? { kind: "cloud", id: first.id } : null;
  }
  const match =
    category === "all"
      ? products[0]
      : products.find((product) => templateTypeToCategory(product.type) === category);
  return match ? { kind: "template", id: match.id } : null;
}

export function TemplatesStoreContent({
  products,
  cloudProducts,
  initialCategory = "all",
}: {
  products: PublicTemplateProduct[];
  cloudProducts: CloudSoftwareProduct[];
  initialCategory?: CategoryFilter;
}) {
  const [category, setCategory] = useState<CategoryFilter>(initialCategory);
  const [selected, setSelected] = useState<Selection | null>(() =>
    selectionFromCategory(initialCategory, products, cloudProducts),
  );
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
  const [utr, setUtr] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofBusy, setProofBusy] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [proofDone, setProofDone] = useState<string | null>(null);
  const [upiCopied, setUpiCopied] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === CLOUD_SOFTWARES_ANCHOR || hash === "mobile-shop-ops") {
      setCategory("cloud");
      const first = cloudProducts[0];
      if (first) {
        setSelected({ kind: "cloud", id: first.id });
        setStep("catalog");
      }
    }
  }, [cloudProducts]);

  const selectedTemplate = useMemo(
    () =>
      selected?.kind === "template"
        ? (products.find((product) => product.id === selected.id) ?? null)
        : null,
    [products, selected],
  );
  const selectedCloud = useMemo(
    () =>
      selected?.kind === "cloud"
        ? (cloudProducts.find((product) => product.id === selected.id) ?? null)
        : null,
    [cloudProducts, selected],
  );

  const groupedTemplates = useMemo(() => {
    const sheets = products.filter(
      (product) => templateTypeToCategory(product.type) === "sheets",
    );
    const appsheet = products.filter(
      (product) => templateTypeToCategory(product.type) === "appsheet",
    );
    return { sheets, appsheet };
  }, [products]);

  const visibleCategories = TEMPLATE_STORE_CATEGORIES.filter((item) => {
    if (category !== "all" && item.id !== category) return false;
    if (item.id === "sheets") return groupedTemplates.sheets.length > 0;
    if (item.id === "appsheet") return groupedTemplates.appsheet.length > 0;
    return cloudProducts.length > 0;
  });

  function selectTemplate(product: PublicTemplateProduct) {
    setSelected({ kind: "template", id: product.id });
    setStep("catalog");
    setOrderId(null);
    setError(null);
    setUtr("");
    setProofFile(null);
    setProofError(null);
    setProofDone(null);
  }

  function selectCloud(product: CloudSoftwareProduct) {
    setSelected({ kind: "cloud", id: product.id });
    setStep("catalog");
    setOrderId(null);
    setError(null);
  }

  function changeCategory(next: CategoryFilter) {
    setCategory(next);
    const nextSelection = selectionFromCategory(next, products, cloudProducts);
    if (nextSelection) {
      if (nextSelection.kind === "template") {
        const product = products.find((row) => row.id === nextSelection.id);
        if (product) selectTemplate(product);
      } else {
        const product = cloudProducts.find((row) => row.id === nextSelection.id);
        if (product) selectCloud(product);
      }
    }
  }

  async function submitOrder() {
    if (!selectedTemplate) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/templates/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedTemplate.id,
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
    if (!selectedTemplate) return;
    const note = `Template ${selectedTemplate.slug}`.slice(0, 80);
    if (isMobileDevice()) {
      openPhonePePayment({
        upiId: SHEETOMATIC_UPI_PAYMENT.upiId,
        payeeName: SHEETOMATIC_UPI_PAYMENT.payeeName,
        amount: selectedTemplate.priceInr,
        note,
      });
      return;
    }
    window.location.href = buildUpiPayUrl({
      upiId: SHEETOMATIC_UPI_PAYMENT.upiId,
      payeeName: SHEETOMATIC_UPI_PAYMENT.payeeName,
      amount: selectedTemplate.priceInr,
      note,
    });
  }

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(SHEETOMATIC_UPI_PAYMENT.upiId);
      setUpiCopied(true);
      window.setTimeout(() => setUpiCopied(false), 2000);
    } catch {
      // Clipboard unavailable — UPI ID stays visible for manual copy.
    }
  }

  async function submitProof() {
    if (!orderId) return;
    if (!utr.trim() && !proofFile) {
      setProofError("Add the UPI reference (UTR) or upload a payment screenshot.");
      return;
    }
    setProofBusy(true);
    setProofError(null);
    try {
      const form = new FormData();
      if (utr.trim()) form.set("utr", utr.trim());
      if (proofFile) form.set("file", proofFile);
      const response = await fetch(`/api/templates/order/${orderId}/proof`, {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setProofError(data.error ?? "Could not submit. Try again or WhatsApp us.");
        return;
      }
      setProofDone(
        data.message ??
          "Confirmation received. We verify and email your copy link shortly.",
      );
    } catch {
      setProofError("Network error. Try again.");
    } finally {
      setProofBusy(false);
    }
  }

  const shopWa = selectedCloud
    ? buildWhatsAppUrl(
        `Hi Sheetomatic, I want the ${selectedCloud.name} license (₹${selectedCloud.priceMonthlyInr.toLocaleString("en-IN")}/mo) for my mobile shop — new/used phones, repairs, accessories.`,
      )
    : buildWhatsAppUrl(
        "Hi Sheetomatic, I want a Cloud Software license for my shop.",
      );

  return (
    <div className="tpl-page">
      <header className="tpl-hero">
        <p className="tpl-eyebrow">Smart Office Templates</p>
        <h1>Google Sheets, AppSheet &amp; Cloud Softwares</h1>
        <p className="tpl-lead">
          Three shelves: Google Sheets Based copies, AppSheet Based apps, and
          Cloud Softwares — native Sheetomatic apps you run in Workspace, not
          another spreadsheet.
        </p>
      </header>

      <nav className="tpl-cats" aria-label="Template categories">
        <button
          type="button"
          className={category === "all" ? "tpl-cat is-active" : "tpl-cat"}
          onClick={() => changeCategory("all")}
        >
          All
        </button>
        {TEMPLATE_STORE_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={category === item.id ? "tpl-cat is-active" : "tpl-cat"}
            onClick={() => changeCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="tpl-layout">
        <section className="tpl-catalog" aria-label="Catalog">
          {visibleCategories.length === 0 ? (
            <p>No templates listed yet.</p>
          ) : (
            visibleCategories.map((item) => {
              const rows =
                item.id === "sheets"
                  ? groupedTemplates.sheets
                  : item.id === "appsheet"
                    ? groupedTemplates.appsheet
                    : [];
              return (
                <div
                  className="tpl-group"
                  key={item.id}
                  id={item.id === "cloud" ? CLOUD_SOFTWARES_ANCHOR : item.id}
                >
                  <h2>{item.label}</h2>
                  {item.id === "cloud" ? (
                    <ul className="tpl-product-list">
                      {cloudProducts.map((product) => {
                        const isSelected =
                          selected?.kind === "cloud" && selected.id === product.id;
                        return (
                          <li key={product.id} id={product.key}>
                            <button
                              type="button"
                              className={isSelected ? "tpl-card is-selected" : "tpl-card"}
                              onClick={() => selectCloud(product)}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                className="tpl-thumb tpl-thumb-mark"
                                src={product.thumbnailUrl}
                                alt=""
                                width={120}
                                height={120}
                              />
                              <span className="tpl-card-body">
                                <span className="tpl-card-name">{product.name}</span>
                                <span className="tpl-card-meta">
                                  Cloud Softwares · ₹
                                  {product.priceMonthlyInr.toLocaleString("en-IN")}
                                  / month
                                </span>
                                <span className="tpl-card-desc">{product.icp}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <ul className="tpl-product-list">
                      {rows.map((product) => {
                        const isSelected =
                          selected?.kind === "template" &&
                          selected.id === product.id;
                        return (
                          <li key={product.id}>
                            <button
                              type="button"
                              className={isSelected ? "tpl-card is-selected" : "tpl-card"}
                              onClick={() => selectTemplate(product)}
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
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </section>

        <aside className="tpl-checkout" aria-label="Checkout">
          {selectedCloud ? (
            <div className="tpl-form">
              <p className="tpl-eyebrow">Cloud Softwares</p>
              <h2>{selectedCloud.name}</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="tpl-checkout-thumb tpl-thumb-mark"
                src={selectedCloud.thumbnailUrl}
                alt=""
                width={280}
                height={280}
              />
              <p className="tpl-price">
                ₹{selectedCloud.priceMonthlyInr.toLocaleString("en-IN")}
                <span className="tpl-price-period"> / month per shop</span>
              </p>
              <p className="tpl-fine">
                ₹{selectedCloud.priceAnnualInr.toLocaleString("en-IN")} / year ·
                excl. GST. Native Sheetomatic app — not a Google Sheet or
                AppSheet copy.
              </p>
              <p className="tpl-fine">{selectedCloud.description}</p>
              <ol className="tpl-steps">
                <li>Have (or buy) a Sheetomatic workspace</li>
                <li>Admin: Licensed kits → Request license</li>
                <li>Pay the UPI invoice. We confirm the UTR</li>
                <li>Open Mobile shop. Counter starts</li>
              </ol>
              <div className="tpl-cloud-actions">
                <a className={marketingButtonClass("whatsapp")} href={shopWa}>
                  <span className="btn-cta-icon-wrap" aria-hidden>
                    <WhatsAppIcon className="btn-cta-icon" size={18} />
                  </span>
                  <span>WhatsApp {whatsappDisplayNumber}</span>
                </a>
                <Link
                  className={marketingButtonClass("secondary")}
                  href={WORKSPACE_LOGIN_HREF}
                >
                  Existing customer — sign in
                </Link>
                <Link className={marketingButtonClass("secondary")} href="/pricing">
                  Workspace plans
                </Link>
              </div>
            </div>
          ) : !selectedTemplate ? (
            <p>Select a template to continue.</p>
          ) : step === "pay" && orderId ? (
            <div className="tpl-done">
              <h2>Pay ₹{selectedTemplate.priceInr.toLocaleString("en-IN")}</h2>
              <ol className="tpl-steps">
                <li className={proofDone ? "is-done" : "is-active"}>
                  Pay on UPI — scan the QR or tap the button
                </li>
                <li className={proofDone ? "is-done" : ""}>
                  Upload the payment confirmation below
                </li>
                <li>We verify &amp; email your Make a copy link to{" "}
                  <strong>{email}</strong>
                </li>
              </ol>

              <div className="tpl-pay-card">
                <div className="tpl-pay-amount">
                  <span>Amount</span>
                  <strong>₹{selectedTemplate.priceInr.toLocaleString("en-IN")}</strong>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="tpl-pay-qr"
                  src={SHEETOMATIC_UPI_PAYMENT.qrImageSrc}
                  alt="PhonePe UPI QR"
                  width={168}
                  height={168}
                />
                <p className="tpl-pay-scan">Scan with any UPI app</p>
                <button
                  type="button"
                  className="tpl-upi-id"
                  onClick={() => void copyUpiId()}
                  title="Copy UPI ID"
                >
                  <code>{SHEETOMATIC_UPI_PAYMENT.upiId}</code>
                  <span>{upiCopied ? "Copied ✓" : "Copy"}</span>
                </button>
                <button type="button" className="tpl-btn primary" onClick={payNow}>
                  Open UPI / PhonePe
                </button>
              </div>

              {proofDone ? (
                <div className="tpl-proof-done">
                  <p>
                    <strong>✓ {proofDone}</strong>
                  </p>
                  <p className="tpl-fine">
                    Order ID: <code>{orderId}</code>
                  </p>
                </div>
              ) : (
                <form
                  className="tpl-proof-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitProof();
                  }}
                >
                  <h3>Paid? Confirm it here</h3>
                  <label>
                    UPI reference (UTR)
                    <input
                      value={utr}
                      onChange={(e) => setUtr(e.target.value)}
                      placeholder="12-digit UTR from your UPI app"
                      inputMode="numeric"
                    />
                  </label>
                  <label>
                    Payment screenshot
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {proofError ? <p className="tpl-error">{proofError}</p> : null}
                  <button
                    type="submit"
                    className="tpl-btn primary"
                    disabled={proofBusy}
                  >
                    {proofBusy ? "Submitting…" : "I've paid — submit confirmation"}
                  </button>
                  <p className="tpl-fine">
                    Order ID: <code>{orderId}</code> · UTR or screenshot, either
                    works. We approve and the copy link lands in your inbox.
                  </p>
                </form>
              )}
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
                {selectedTemplate.name} · ₹
                {selectedTemplate.priceInr.toLocaleString("en-IN")}
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
              <h2>{selectedTemplate.name}</h2>
              {selectedTemplate.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="tpl-checkout-thumb"
                  src={selectedTemplate.thumbnailUrl}
                  alt=""
                  width={280}
                  height={280}
                />
              ) : null}
              <p className="tpl-price">
                ₹{selectedTemplate.priceInr.toLocaleString("en-IN")}
              </p>
              {selectedTemplate.description ? (
                <p className="tpl-fine">{selectedTemplate.description}</p>
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
