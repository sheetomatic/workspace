"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  SHEETOMATIC_UPI_PAYMENT,
  buildPlanPaymentNote,
  isMobileDevice,
  openPhonePePayment,
} from "@/lib/payments/upi-phonepe";
import {
  whatsappPlanPrice,
  whatsappPlansPage,
  type WhatsappPlanCard,
} from "@/lib/content/whatsapp-plans-content";

function planTitle(plan: WhatsappPlanCard) {
  const messages = plan.messages === "Unlimited" ? "Unlimited" : plan.messages;
  return `${messages} WA messages · ${plan.duration}`;
}

export function WhatsappPlansGrid() {
  const [selectedPlan, setSelectedPlan] = useState<WhatsappPlanCard | null>(null);
  const [copied, setCopied] = useState(false);

  const closeModal = useCallback(() => {
    setSelectedPlan(null);
    setCopied(false);
  }, []);

  useEffect(() => {
    if (!selectedPlan) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeModal, selectedPlan]);

  function handlePlanClick(plan: WhatsappPlanCard) {
    setSelectedPlan(plan);
    if (isMobileDevice()) {
      openPhonePePayment({
        upiId: SHEETOMATIC_UPI_PAYMENT.upiId,
        payeeName: SHEETOMATIC_UPI_PAYMENT.payeeName,
        amount: plan.price,
        note: buildPlanPaymentNote(plan),
      });
    }
  }

  function handlePhonePeClick() {
    if (!selectedPlan) {
      return;
    }
    openPhonePePayment({
      upiId: SHEETOMATIC_UPI_PAYMENT.upiId,
      payeeName: SHEETOMATIC_UPI_PAYMENT.payeeName,
      amount: selectedPlan.price,
      note: buildPlanPaymentNote(selectedPlan),
    });
  }

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(SHEETOMATIC_UPI_PAYMENT.upiId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <div className="wa-plans-grid">
        {whatsappPlansPage.plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            className={`wa-plan-card wa-plan-card-button${
              plan.highlight ? " wa-plan-card-highlight" : ""
            }`}
            onClick={() => handlePlanClick(plan)}
          >
            <div className="wa-plan-card-top">
              <span className="wa-plan-category">API</span>
              {plan.badge ? <span className="wa-plan-badge">{plan.badge}</span> : null}
            </div>
            <h3 className="wa-plan-name">{planTitle(plan)}</h3>
            <p className="wa-plan-meta">
              Tap to pay · PhonePe / UPI
            </p>
            <p className="wa-plan-price">
              {whatsappPlanPrice(plan.price)}
              <span className="wa-plan-duration"> / {plan.duration}</span>
            </p>
          </button>
        ))}
      </div>

      {selectedPlan ? (
        <div
          className="wa-pay-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="wa-pay-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wa-pay-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="wa-pay-modal-head">
              <div>
                <p className="wa-pay-modal-eyebrow">Pay for plan</p>
                <h2 id="wa-pay-modal-title">{planTitle(selectedPlan)}</h2>
              </div>
              <button
                type="button"
                className="wa-pay-modal-close"
                aria-label="Close"
                onClick={closeModal}
              >
                ×
              </button>
            </header>

            <p className="wa-pay-modal-amount">
              Amount: <strong>{whatsappPlanPrice(selectedPlan.price)}</strong>
            </p>

            <div className="wa-pay-modal-qr">
              <Image
                src={SHEETOMATIC_UPI_PAYMENT.qrImageSrc}
                alt="PhonePe QR code for Shyam Kumar Banjare"
                width={280}
                height={380}
                className="wa-pay-modal-qr-image"
              />
              <p className="wa-pay-modal-qr-hint">Scan with PhonePe or any UPI app</p>
            </div>

            <div className="wa-pay-modal-upi">
              <span>UPI ID</span>
              <code>{SHEETOMATIC_UPI_PAYMENT.upiId}</code>
              <button type="button" className="btn-secondary btn-sm" onClick={copyUpiId}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="wa-pay-modal-actions">
              <button type="button" className="btn-primary btn-block" onClick={handlePhonePeClick}>
                Open PhonePe · {whatsappPlanPrice(selectedPlan.price)}
              </button>
              <p className="wa-pay-modal-note">
                On mobile, PhonePe opens with the plan amount pre-filled. Share payment screenshot on
                WhatsApp after paying.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
