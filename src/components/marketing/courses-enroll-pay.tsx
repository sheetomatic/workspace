"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { buildWhatsAppUrl } from "@/app/site-content";
import {
  COURSE_ENROLLMENT_PRICE_INR,
  buildCourseEnrollmentWhatsAppMessage,
  buildCoursePaymentNote,
  courseCohorts,
  courseEnrollmentPriceLabel,
  courseEnrollmentSchedule,
  type CourseCohortId,
} from "@/lib/content/courses-enrollment";
import {
  SHEETOMATIC_UPI_PAYMENT,
  isMobileDevice,
  openPhonePePayment,
} from "@/lib/payments/upi-phonepe";
import "./courses-enroll-pay.css";

type Step = "details" | "pay" | "done";

type Props = {
  triggerLabel?: string;
  triggerClassName?: string;
};

export function CoursesEnrollPay({
  triggerLabel = "Enroll & pay",
  triggerClassName = "btn-cta btn-primary",
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cohort, setCohort] = useState<CourseCohortId>("MON_FRI");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [bookingToken, setBookingToken] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setError(null);
    setCopied(false);
    if (step === "done") {
      setStep("details");
      setName("");
      setPhone("");
      setEmail("");
      setCohort("MON_FRI");
      setEnrollmentId(null);
      setBookingToken(null);
    }
  }, [step]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  function openPayFlow() {
    setOpen(true);
    setStep("details");
    setError(null);
  }

  function goToPay() {
    setError(null);
    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }
    setStep("pay");
    if (isMobileDevice()) {
      openPhonePePayment({
        upiId: SHEETOMATIC_UPI_PAYMENT.upiId,
        payeeName: SHEETOMATIC_UPI_PAYMENT.payeeName,
        amount: COURSE_ENROLLMENT_PRICE_INR,
        note: buildCoursePaymentNote(cohort),
      });
    }
  }

  function handlePhonePeClick() {
    openPhonePePayment({
      upiId: SHEETOMATIC_UPI_PAYMENT.upiId,
      payeeName: SHEETOMATIC_UPI_PAYMENT.payeeName,
      amount: COURSE_ENROLLMENT_PRICE_INR,
      note: buildCoursePaymentNote(cohort),
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

  async function markPaidAndNotify() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, cohort }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        enrollmentId?: string;
        bookingToken?: string | null;
        error?: string;
      };
      if (!response.ok || !data.ok || !data.enrollmentId) {
        setError(data.error ?? "Could not save enrollment. Try again or WhatsApp us.");
        return;
      }
      setEnrollmentId(data.enrollmentId);
      setBookingToken(data.bookingToken ?? null);
      setStep("done");
      const message = buildCourseEnrollmentWhatsAppMessage({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        cohort,
        amountInr: COURSE_ENROLLMENT_PRICE_INR,
        enrollmentId: data.enrollmentId,
      });
      window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
    } catch {
      setError("Network error. Try again or WhatsApp us.");
    } finally {
      setSubmitting(false);
    }
  }

  const priceLabel = courseEnrollmentPriceLabel();

  return (
    <>
      <button type="button" className={triggerClassName} onClick={openPayFlow}>
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="course-pay-modal-backdrop"
          role="presentation"
          onClick={close}
        >
          <div
            className="course-pay-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-pay-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="course-pay-modal-head">
              <div>
                <p className="course-pay-modal-eyebrow">
                  {step === "done" ? "Submitted" : "Sheets · AppSheet · Looker"}
                </p>
                <h2 id="course-pay-modal-title">
                  {step === "details"
                    ? "Choose your slots"
                    : step === "pay"
                      ? "Pay & book"
                      : "Payment pending confirmation"}
                </h2>
              </div>
              <button
                type="button"
                className="course-pay-modal-close"
                aria-label="Close"
                onClick={close}
              >
                ×
              </button>
            </header>

            {step === "details" ? (
              <div className="course-pay-body">
                <p className="course-pay-lead">
                  {courseEnrollmentSchedule.totalClasses} live classes ×{" "}
                  {courseEnrollmentSchedule.sessionDurationLabel} (
                  {courseEnrollmentSchedule.totalHours} hours). Weekly{" "}
                  {courseEnrollmentSchedule.sessionsPerWeek} sessions at{" "}
                  <strong>{courseEnrollmentSchedule.sessionTimeLabel}</strong>.
                </p>

                <fieldset className="course-pay-cohorts">
                  <legend>Pick your cohort</legend>
                  {courseCohorts.map((option) => (
                    <label
                      key={option.id}
                      className={`course-pay-cohort${
                        cohort === option.id ? " is-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="cohort"
                        value={option.id}
                        checked={cohort === option.id}
                        onChange={() => setCohort(option.id)}
                      />
                      <span>
                        <strong>{option.label}</strong>
                        <small>
                          {option.daysLabel} · {courseEnrollmentSchedule.sessionTimeLabel}
                        </small>
                      </span>
                    </label>
                  ))}
                </fieldset>

                <label className="course-pay-field">
                  Full name
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    required
                  />
                </label>
                <label className="course-pay-field">
                  Phone (WhatsApp)
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    required
                  />
                </label>
                <label className="course-pay-field">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>

                {error ? <p className="course-pay-error">{error}</p> : null}

                <button type="button" className="btn-primary btn-block" onClick={goToPay}>
                  Continue to pay · {priceLabel}
                </button>
              </div>
            ) : null}

            {step === "pay" ? (
              <div className="course-pay-body">
                <p className="course-pay-amount">
                  Amount: <strong>{priceLabel}</strong>
                </p>
                <p className="course-pay-meta">
                  Cohort:{" "}
                  <strong>
                    {courseCohorts.find((item) => item.id === cohort)?.label}
                  </strong>{" "}
                  · {courseEnrollmentSchedule.sessionTimeLabel}
                </p>

                <div className="course-pay-qr">
                  <Image
                    src={SHEETOMATIC_UPI_PAYMENT.qrImageSrc}
                    alt="PhonePe QR code for Shyam Kumar Banjare"
                    width={280}
                    height={380}
                    className="course-pay-qr-image"
                  />
                  <p className="course-pay-qr-hint">Scan with PhonePe or any UPI app</p>
                </div>

                <div className="course-pay-upi">
                  <span>UPI ID</span>
                  <code>{SHEETOMATIC_UPI_PAYMENT.upiId}</code>
                  <button type="button" className="btn-secondary btn-sm" onClick={copyUpiId}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="course-pay-actions">
                  <button
                    type="button"
                    className="btn-primary btn-block"
                    onClick={handlePhonePeClick}
                  >
                    Open PhonePe · {priceLabel}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-block"
                    disabled={submitting}
                    onClick={markPaidAndNotify}
                  >
                    {submitting ? "Saving…" : "I've paid — send for confirmation"}
                  </button>
                  <button
                    type="button"
                    className="course-pay-back"
                    onClick={() => setStep("details")}
                  >
                    ← Change cohort or details
                  </button>
                  <p className="course-pay-note">
                    Same flow as WhatsApp API plans: pay on UPI, then owner confirms
                    payment and books your slots. Share the payment screenshot on
                    WhatsApp after you tap the button above.
                  </p>
                </div>

                {error ? <p className="course-pay-error">{error}</p> : null}
              </div>
            ) : null}

            {step === "done" ? (
              <div className="course-pay-body">
                <p className="course-pay-success">
                  Payment pending confirmation. After payment is verified, open
                  your booking link to pick the first session date — we generate
                  all {courseEnrollmentSchedule.totalClasses}{" "}
                  <strong>
                    {courseCohorts.find((item) => item.id === cohort)?.label}
                  </strong>{" "}
                  slots ({courseEnrollmentSchedule.sessionTimeLabel}).
                </p>
                {enrollmentId ? (
                  <p className="course-pay-meta">Enrollment ID: {enrollmentId}</p>
                ) : null}
                <a
                  className="btn-primary btn-block"
                  href={buildWhatsAppUrl(
                    buildCourseEnrollmentWhatsAppMessage({
                      name: name.trim(),
                      phone: phone.trim(),
                      email: email.trim(),
                      cohort,
                      amountInr: COURSE_ENROLLMENT_PRICE_INR,
                      enrollmentId: enrollmentId ?? undefined,
                    }),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open WhatsApp · share screenshot
                </a>
                {bookingToken ? (
                  <a
                    className="btn-secondary btn-block"
                    href={`/courses/book-slots?token=${bookingToken}`}
                  >
                    Book training slots (after confirmation)
                  </a>
                ) : null}
                <button type="button" className="btn-secondary btn-block" onClick={close}>
                  Done
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
