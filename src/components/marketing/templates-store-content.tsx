"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buildWhatsAppUrl } from "@/app/site-content";
import {
  CLOUD_SOFTWARES_ANCHOR,
  TEMPLATE_STORE_CATEGORIES,
  templateTypeToCategory,
  type TemplateStoreCategoryId,
} from "@/lib/templates/categories";
import type { CloudSoftwareProduct } from "@/lib/templates/cloud-softwares";
import { GST_STATE_OPTIONS } from "@/lib/leads/gst-invoice";
import { cartTotals, inr, parseTemplateBuyer } from "@/lib/templates/commerce";
import { RazorpayPayFrame } from "./razorpay-pay-frame";
import { TemplateArtwork } from "./template-artwork";
import "./templates-store.css";
import "./template-cart.css";

export type PublicTemplateProduct = {
  id: string;
  slug: string;
  name: string;
  type: "APPSHEET" | "SHEETS" | "EXCEL";
  priceInr: number;
  description: string | null;
  thumbnailUrl: string | null;
  purchasable: boolean;
};
type Order = {
  id: string;
  paid: boolean;
  paymentMode: string;
  paymentClaimed: boolean;
  claimedPaymentRef: string | null;
  totals: ReturnType<typeof cartTotals>;
  invoiceNumber: string | null;
  totalPaise: number;
  gatewayOrderId: string;
  keyId: string;
  lines: { name: string; priceInr: number; copyLink?: string }[];
};
type Access = { id: string; token: string };
const CART_KEY = "sheetomatic-template-cart-v1";
const ORDER_KEY = "sheetomatic-template-checkout-v1";

function freshToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
async function loadGateway() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error("Could not load Razorpay. Please retry."));
    };
    document.body.appendChild(script);
  });
}

export function TemplatesStoreContent({
  products,
  cloudProducts,
  initialCategory = "all",
  checkoutEnabled = false,
  sellerStateCode = "22",
}: {
  products: PublicTemplateProduct[];
  cloudProducts: CloudSoftwareProduct[];
  initialCategory?: TemplateStoreCategoryId | "all";
  checkoutEnabled?: boolean;
  sellerStateCode?: string;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [cart, setCart] = useState<string[]>([]);
  const [buyer, setBuyer] = useState({
    name: "",
    email: "",
    phone: "",
    billedTo: "",
    address: "",
    city: "",
    stateCode: "",
    pin: "",
    gstin: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const token = useRef<string | null>(null);
  const cartSection = useRef<HTMLElement>(null);

  useEffect(() => {
    // Restore browser-only state after hydration. No PII or payment details are persisted.
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
      if (Array.isArray(saved)) {
        // Browser storage is an external source; restore only after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCart(
          [
            ...new Set(
              saved.filter(
                (id): id is string =>
                  typeof id === "string" && products.some((p) => p.id === id),
              ),
            ),
          ].slice(0, 20),
        );
      }
      const pending = JSON.parse(sessionStorage.getItem(ORDER_KEY) ?? "null");
      if (
        pending &&
        /^[a-f0-9]{64}$/.test(pending.token) &&
        typeof pending.id === "string"
      ) {
        setAccess(pending);
        token.current = pending.token;
      }
    } catch {
      /* Cart remains usable without browser storage. */
    }
  }, [products]);

  useEffect(() => {
    if (!access) return;
    let cancelled = false;
    fetch(`/api/templates/checkout/${access.id}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${access.token}` },
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Saved order could not be loaded. Contact support before paying again.",
          );
        const saved = (await response.json()) as Order;
        if (!cancelled) setOrder(saved);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [access]);

  const items = cart
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is PublicTemplateProduct => Boolean(p));
  const totals =
    order?.totals ??
    cartTotals(
      items.map((p) => p.priceInr),
      buyer.stateCode || sellerStateCode,
      sellerStateCode,
    );
  function updateCart(ids: string[]) {
    setCart(ids);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(ids));
    } catch {
      /* In-memory fallback. */
    }
  }
  function add(p: PublicTemplateProduct) {
    if (access || !p.purchasable || cart.includes(p.id)) return;
    if (cart.length >= 20) {
      setMessage("Up to 20 templates per order.");
      return;
    }
    updateCart([...cart, p.id]);
    setMessage(`${p.name} added to cart.`);
  }
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    auth = access?.token,
  ) {
    const response = await fetch(path, {
      method,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error ?? "Request failed. Please try again.");
    return data as Order;
  }
  function acceptOrder(data: Order) {
    setOrder(data);
    if (data.paid) {
      updateCart([]);
      setMessage("Payment verified. Your templates and tax invoice are ready.");
    }
  }
  async function checkPayment() {
    if (!access) return;
    setBusy(true);
    try {
      const result = await request(`/api/templates/checkout/${access.id}`);
      acceptOrder(result);
      if (!result.paid)
        setMessage(
          "Payment is not yet confirmed. Do not pay again if your account was debited. Check again shortly or contact support.",
        );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to check payment.");
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    setBusy(true);
    setMessage("");
    try {
      const validBuyer = access ? null : parseTemplateBuyer(buyer);
      if (!accepted)
        throw new Error(
          "Accept the standard-template terms before continuing.",
        );
      token.current ??= freshToken();
      const auth = token.current;
      const current = access
        ? await request(`/api/templates/checkout/${access.id}`)
        : await request(
            "/api/templates/checkout",
            "POST",
            {
              productIds: cart,
              buyer: { ...validBuyer, gstin: validBuyer?.gstin ?? "" },
              acceptedTerms: true,
            },
            auth,
          );
      const saved = { id: current.id, token: auth };
      setAccess(saved);
      setOrder(current);
      try {
        sessionStorage.setItem(ORDER_KEY, JSON.stringify(saved));
      } catch {
        /* Retained in memory. */
      }
      if (current.paid) {
        acceptOrder(current);
        return;
      }
      if (current.paymentMode === "hosted_manual") {
        setMessage(
          "Order saved. Pay the exact GST-inclusive total below, then submit your Razorpay receipt for confirmation.",
        );
        return;
      }
      await loadGateway();
      if (!window.Razorpay) throw new Error("Razorpay did not load.");
      const gateway = new window.Razorpay({
        key: current.keyId,
        order_id: current.gatewayOrderId,
        amount: current.totalPaise,
        currency: "INR",
        name: "Sheetomatic Technologies",
        description: "Standard templates including GST",
        prefill: validBuyer
          ? {
              name: validBuyer.name,
              email: validBuyer.email,
              contact: validBuyer.phone,
            }
          : {},
        handler: async (result: unknown) => {
          setBusy(true);
          try {
            acceptOrder(
              await request(
                `/api/templates/checkout/${current.id}`,
                "POST",
                result,
                auth,
              ),
            );
          } catch (e) {
            setMessage(
              e instanceof Error
                ? e.message
                : "Verification pending. Check payment status before retrying.",
            );
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () =>
            setMessage(
              "Checkout closed. Your order is saved. Check payment status before retrying if you were debited.",
            ),
        },
        theme: { color: "#0369a1" },
      });
      gateway.open();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not start checkout.");
    } finally {
      setBusy(false);
    }
  }
  async function submitReceipt() {
    if (!access) return;
    setBusy(true);
    try {
      const result = await request(
        `/api/templates/checkout/${access.id}`,
        "POST",
        { paymentReference },
      );
      acceptOrder(result);
      setMessage(
        "Receipt submitted. Payment pending manual confirmation. Do not pay again. Your GST invoice and copy links will be emailed after verification.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to submit receipt.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function invoice() {
    if (!access || !order?.paid) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/templates/checkout/${access.id}/invoice`,
        {
          headers: { Authorization: `Bearer ${access.token}` },
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error("Invoice is not available yet.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${order.invoiceNumber?.replaceAll("/", "-")}.html`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Invoice download failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tpl-page">
      <header className="tpl-hero">
        <p className="tpl-eyebrow">Ready-made. Priced for small businesses.</p>
        <h1>Useful templates. Every copy under ₹999.</h1>
        <p className="tpl-lead">
          Google Sheets from ₹499. AppSheet copies up to ₹998. One-time template
          purchase, without customisation. GST extra at checkout.
        </p>
        <p className="tpl-fine">
          AppSheet / Google subscriptions, setup services and custom development
          are not included. Hosted Cloud Software plans are sold separately.
        </p>
      </header>
      <nav className="tpl-cats" aria-label="Template categories">
        {[
          { id: "all" as const, label: "All products" },
          ...TEMPLATE_STORE_CATEGORIES,
        ].map((c) => (
          <button
            key={c.id}
            type="button"
            className={`tpl-cat${category === c.id ? " is-active" : ""}`}
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          className="tpl-cat"
          onClick={() =>
            cartSection.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
        >
          Cart ({cart.length})
        </button>
      </nav>
      <div className="tpl-layout">
        <section className="tpl-catalog" aria-label="Templates">
          {products
            .filter(
              (p) =>
                category === "all" ||
                templateTypeToCategory(p.type) === category,
            )
            .map((p) => (
              <article className="tpl-shop-card" key={p.id}>
                <TemplateArtwork slug={p.slug} name={p.name} type={p.type} />
                <div>
                  <p className="tpl-eyebrow">
                    {p.type === "APPSHEET"
                      ? "AppSheet copy"
                      : "Spreadsheet template"}
                  </p>
                  <h2>{p.name}</h2>
                  <p className="tpl-fine">
                    {p.description?.split(/Pay on UPI|Pay on Razorpay/i)[0]}
                  </p>
                  <p className="tpl-shop-price">
                    {inr(p.priceInr * 100)} <small>+ 18% GST · one-time</small>
                  </p>
                  <p className="tpl-fine">
                    Standard copy only · No customisation
                  </p>
                  <button
                    type="button"
                    className="tpl-btn primary"
                    disabled={
                      !p.purchasable || cart.includes(p.id) || Boolean(access)
                    }
                    onClick={() => add(p)}
                  >
                    {!p.purchasable
                      ? "Coming soon"
                      : cart.includes(p.id)
                        ? "Added to cart"
                        : "Add to cart"}
                  </button>
                </div>
              </article>
            ))}
          {(category === "all" || category === "cloud") &&
            cloudProducts.length > 0 && (
              <section id={CLOUD_SOFTWARES_ANCHOR}>
                <h2>Hosted Cloud Software</h2>
                <p className="tpl-fine">
                  Separate recurring subscriptions, not part of the one-time
                  template offer.
                </p>
                {cloudProducts.map((p) => (
                  <article className="tpl-shop-card" id={p.key} key={p.id}>
                    <div>
                      <h3>{p.name}</h3>
                      <p>{p.description}</p>
                      <p>{inr(p.priceMonthlyInr * 100)} / month + GST</p>
                      <a
                        className="tpl-btn"
                        href={buildWhatsAppUrl(
                          `I would like details of ${p.name}, the hosted Cloud Software subscription.`,
                        )}
                      >
                        Discuss this subscription
                      </a>{" "}
                      <Link href="/pricing">Workspace plans</Link>
                    </div>
                  </article>
                ))}
              </section>
            )}
        </section>
        <aside
          className="tpl-checkout"
          ref={cartSection}
          aria-label="Shopping cart"
        >
          <h2>Your cart {items.length > 0 && `(${items.length})`}</h2>
          <div role="status" aria-live="polite" className="tpl-cart-message">
            {message}
          </div>
          {access && (
            <div className="tpl-cart-notice">
              <p>Saved order: {access.id}</p>
              <button
                className="tpl-btn"
                type="button"
                disabled={busy}
                onClick={() => void checkPayment()}
              >
                Check payment status
              </button>
            </div>
          )}
          {order?.paymentMode === "hosted_manual" && !order.paid && (
            <section className="tpl-receipt" aria-label="Payment and receipt">
              <h3>
                {order.paymentClaimed
                  ? "Payment pending confirmation"
                  : "Your order is ready to pay"}
              </h3>
              <p>{order.lines.map((l) => l.name).join(" · ")}</p>
              <p>
                <strong>{inr(order.totalPaise)} including GST</strong>
              </p>
              {order.paymentClaimed ? (
                <p>
                  Receipt: {order.claimedPaymentRef}. Our team will verify your
                  payment and email your tax invoice and template links. Please
                  do not pay again.
                </p>
              ) : (
                <>
                  <RazorpayPayFrame
                    amountInr={order.totalPaise / 100}
                    description={`Templates · ${order.id} · GST included`}
                    email={buyer.email}
                    phone={buyer.phone}
                    onPaymentReference={setPaymentReference}
                  />
                  <form
                    className="tpl-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void submitReceipt();
                    }}
                  >
                    <label>
                      Razorpay payment ID from your receipt
                      <input
                        name="paymentReference"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        required
                        pattern="pay_[a-zA-Z0-9]{6,80}"
                        maxLength={84}
                        placeholder="pay_…"
                      />
                    </label>
                    <button
                      className="tpl-btn primary"
                      disabled={busy}
                      type="submit"
                    >
                      {busy ? "Submitting…" : "I've paid — submit receipt"}
                    </button>
                  </form>
                  <p className="tpl-fine">
                    A receipt submission does not confirm payment. We verify the
                    payment in our merchant account before issuing your invoice
                    or releasing downloads.
                  </p>
                </>
              )}
              <a
                href={buildWhatsAppUrl(
                  `Please help with template order ${order.id}.`,
                )}
              >
                Need help with this order?
              </a>
            </section>
          )}
          {order?.paid ? (
            <>
              <h3>Payment verified</h3>
              <p>
                Invoice {order.invoiceNumber} · {inr(order.totalPaise)}
              </p>
              <ul>
                {order.lines.map((l) => (
                  <li key={l.name}>
                    <a
                      href={l.copyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open {l.name}
                    </a>
                  </li>
                ))}
              </ul>
              <button
                className="tpl-btn primary"
                type="button"
                disabled={busy}
                onClick={() => void invoice()}
              >
                Download tax invoice
              </button>
              <p className="tpl-fine">
                Open the downloaded invoice and choose Print → Save as PDF.
              </p>
              <button
                className="tpl-btn"
                type="button"
                onClick={() => {
                  setAccess(null);
                  setOrder(null);
                  token.current = null;
                  sessionStorage.removeItem(ORDER_KEY);
                }}
              >
                Start another cart
              </button>
            </>
          ) : (
            <>
              {items.length === 0 ? (
                <p>Add a template to see your total.</p>
              ) : (
                <>
                  <ul className="tpl-cart-lines">
                    {items.map((p) => (
                      <li key={p.id}>
                        <span>
                          {p.name}
                          <br />
                          <strong>{inr(p.priceInr * 100)}</strong>
                        </span>
                        <button
                          type="button"
                          className="tpl-cart-remove"
                          aria-label={`Remove ${p.name}`}
                          disabled={busy || Boolean(access)}
                          onClick={() =>
                            updateCart(cart.filter((id) => id !== p.id))
                          }
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <dl className="tpl-cart-totals">
                    <div>
                      <dt>Subtotal</dt>
                      <dd>{inr(totals.subtotalPaise)}</dd>
                    </div>
                    {!buyer.stateCode && !order ? (
                      <div>
                        <dt>GST (18%) — estimate</dt>
                        <dd>{inr(totals.gstPaise)}</dd>
                      </div>
                    ) : totals.igstPaise ? (
                      <div>
                        <dt>IGST (18%)</dt>
                        <dd>{inr(totals.igstPaise)}</dd>
                      </div>
                    ) : (
                      <>
                        <div>
                          <dt>CGST (9%)</dt>
                          <dd>{inr(totals.cgstPaise)}</dd>
                        </div>
                        <div>
                          <dt>SGST (9%)</dt>
                          <dd>{inr(totals.sgstPaise)}</dd>
                        </div>
                      </>
                    )}
                    <div>
                      <dt>Total including GST</dt>
                      <dd>
                        <strong>
                          {inr(order?.totalPaise ?? totals.totalPaise)}
                        </strong>
                      </dd>
                    </div>
                  </dl>
                  {order?.paymentMode !== "hosted_manual" && (
                    <form
                      className="tpl-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void pay();
                      }}
                    >
                      <h3>Billing details</h3>
                      <p className="tpl-fine">
                        Your invoice uses these details. Indian billing
                        addresses only.
                      </p>
                      <fieldset
                        disabled={busy || Boolean(access)}
                        className="tpl-cart-fields"
                      >
                        {(
                          [
                            {
                              key: "name",
                              label: "Full name",
                              type: "text",
                              max: 120,
                            },
                            {
                              key: "email",
                              label: "Email for delivery",
                              type: "email",
                              max: 254,
                            },
                            {
                              key: "phone",
                              label: "Phone",
                              type: "tel",
                              max: 25,
                            },
                            {
                              key: "billedTo",
                              label: "Company / billing name (optional)",
                              type: "text",
                              max: 200,
                            },
                            {
                              key: "address",
                              label: "Billing address",
                              type: "text",
                              max: 500,
                            },
                            {
                              key: "city",
                              label: "City",
                              type: "text",
                              max: 80,
                            },
                            {
                              key: "pin",
                              label: "PIN code",
                              type: "text",
                              max: 6,
                            },
                            {
                              key: "gstin",
                              label: "GSTIN (optional)",
                              type: "text",
                              max: 15,
                            },
                          ] as const
                        ).map((f) => (
                          <label key={f.key}>
                            {f.label}
                            <input
                              name={f.key}
                              value={buyer[f.key]}
                              type={f.type}
                              maxLength={f.max}
                              required={
                                f.key !== "billedTo" && f.key !== "gstin"
                              }
                              onChange={(e) =>
                                setBuyer({ ...buyer, [f.key]: e.target.value })
                              }
                            />
                          </label>
                        ))}
                        <label>
                          Billing state
                          <select
                            name="stateCode"
                            required
                            value={buyer.stateCode}
                            onChange={(e) =>
                              setBuyer({ ...buyer, stateCode: e.target.value })
                            }
                          >
                            <option value="">Choose your state</option>
                            {GST_STATE_OPTIONS.map((s) => (
                              <option key={s.code} value={s.code}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </fieldset>
                      <label className="tpl-cart-consent">
                        <input
                          type="checkbox"
                          checked={accepted}
                          onChange={(e) => setAccepted(e.target.checked)}
                          required
                        />
                        I am purchasing standard template copies for my own
                        business, without customisation, setup services or
                        third-party subscriptions. I agree to the{" "}
                        <Link href="/terms">terms</Link>.
                      </label>
                      {!checkoutEnabled && (
                        <p className="tpl-cart-notice">
                          Online checkout is being configured. You can build
                          your cart, but no payment will be collected yet.
                        </p>
                      )}
                      <button
                        className="tpl-btn primary"
                        type="submit"
                        disabled={
                          !checkoutEnabled ||
                          busy ||
                          items.some((p) => !p.purchasable)
                        }
                      >
                        {busy
                          ? "Please wait…"
                          : `Continue to payment · ${inr(order?.totalPaise ?? totals.totalPaise)}`}
                      </button>
                      <p className="tpl-fine">
                        Pay through our existing Razorpay checkout. Our team
                        verifies your receipt before emailing your GST invoice
                        and copy links.
                      </p>
                    </form>
                  )}
                </>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
