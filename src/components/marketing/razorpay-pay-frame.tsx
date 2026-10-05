"use client";

import { useState } from "react";
import {
  normalizeRazorpayAmountInr,
  type RazorpayHandleConfig,
} from "@/lib/payments/razorpay-me";
import "./razorpay-pay-frame.css";

type Props = {
  amountInr: number;
  description?: string;
  email?: string;
  phone?: string;
};

type CheckoutSuccess = { razorpay_payment_id?: string };

type RazorpayCheckout = {
  open: () => void;
  on: (event: string, handler: () => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const src = "https://checkout.razorpay.com/v1/checkout.js";
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const script = existing ?? document.createElement("script");
    const done = () => (window.Razorpay ? resolve() : reject(new Error("Razorpay failed to load")));
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => reject(new Error("Razorpay failed to load")), {
      once: true,
    });
    if (!existing) {
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
    } else if (window.Razorpay) {
      resolve();
    }
  });
}

function contactFromPhone(phone?: string): string | undefined {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length < 10 || digits.length > 15) return undefined;
  return digits;
}

export function RazorpayPayFrame({ amountInr, description, email, phone }: Props) {
  const rupees = normalizeRazorpayAmountInr(amountInr);
  const amountLabel = rupees == null ? "" : `₹${rupees.toLocaleString("en-IN")}`;
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  async function openCheckout() {
    if (rupees == null || opening) return;
    setOpening(true);
    setError(null);
    try {
      const [configResponse] = await Promise.all([
        fetch("/api/payments/razorpay-checkout", { cache: "no-store" }),
        loadCheckoutScript(),
      ]);
      const config = (await configResponse.json()) as RazorpayHandleConfig & { error?: string };
      if (!configResponse.ok || !config.keylessHeader || !window.Razorpay) {
        throw new Error(config.error || "Razorpay could not be opened.");
      }
      const contact = contactFromPhone(phone);
      const checkout = new window.Razorpay({
        keyless_header: config.keylessHeader,
        payment_link_id: config.paymentLinkId,
        amount: rupees * 100,
        currency: "INR",
        name: config.merchantName,
        description: description || amountLabel,
        theme: { color: config.brandColor },
        prefill: {
          email: email?.includes("@") ? email.trim() : undefined,
          contact,
        },
        handler(response: CheckoutSuccess) {
          if (response.razorpay_payment_id) setPaymentId(response.razorpay_payment_id);
        },
      });
      checkout.open();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Razorpay could not be opened.");
    } finally {
      setOpening(false);
    }
  }

  if (rupees == null) return null;

  return (
    <div className="rzp-pay">
      <p className="rzp-pay-amount">{amountLabel}</p>
      <p className="rzp-pay-hint">
        This amount is filled in on Razorpay. Pay {amountLabel}, then share the receipt
        below.
      </p>
      <button
        type="button"
        className="rzp-pay-button"
        onClick={openCheckout}
        disabled={opening}
      >
        {opening ? "Opening Razorpay…" : `Pay ${amountLabel}`}
      </button>
      {paymentId ? (
        <p className="rzp-pay-id">
          Razorpay payment id: <strong>{paymentId}</strong>
        </p>
      ) : null}
      {error ? <p className="rzp-pay-error">{error}</p> : null}
    </div>
  );
}
