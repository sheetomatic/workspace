"use client";

import { useCallback, useEffect, useState } from "react";
import { buildWhatsAppUrl } from "@/app/site-content";
import { RazorpayPayFrame } from "@/components/marketing/razorpay-pay-frame";
import {
  getCourseProgram,
  type CourseProgramId,
} from "@/lib/content/course-programs";
import {
  COURSE_GOOGLE_CALENDAR_BOOKING_URL,
  buildCourseEnrollmentWhatsAppMessage,
  courseCohorts,
  courseEnrollmentPriceLabel,
  type CourseCohortId,
} from "@/lib/content/courses-enrollment";
import "./courses-enroll-pay.css";

type Step = "details" | "pay" | "done";

type Props = {
  programId: CourseProgramId;
  triggerLabel?: string;
  triggerClassName?: string;
};

export function CoursesEnrollPay({
  programId,
  triggerLabel = "Enroll & pay",
  triggerClassName = "btn-cta btn-primary",
}: Props) {
  const program = getCourseProgram(programId);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cohort, setCohort] = useState<CourseCohortId>("MON_FRI");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [bookingToken, setBookingToken] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setError(null);
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
  }

  async function markPaidAndNotify() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, cohort, program: programId }),
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
        programId,
        enrollmentId: data.enrollmentId,
      });
      window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
    } catch {
      setError("Network error. Try again or WhatsApp us.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!program) return null;
  const feeLabel = courseEnrollmentPriceLabel(program.priceInr);
  const advanceLabel = courseEnrollmentPriceLabel(program.advanceInr);

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
            className={`course-pay-modal${step === "pay" ? " is-pay" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-pay-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="course-pay-modal-head">
              <div>
                <p className="course-pay-modal-eyebrow">
                  {step === "done" ? "Submitted" : program.name}
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
                  {program.totalClasses} live classes × {program.sessionDurationLabel} (
                  {program.totalHours} hours, {program.weeksLabel}). Two sessions a
                  week at <strong>{program.sessionTimeLabel}</strong>. Fee{" "}
                  {feeLabel}, GST extra. Pay {advanceLabel} now to confirm the seat.
                  Balance before class 1.
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
                          {option.daysLabel} · {program.sessionTimeLabel}
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
                  Continue to pay · {advanceLabel} now
                </button>
              </div>
            ) : null}

            {step === "pay" ? (
              <div className="course-pay-body">
                <p className="course-pay-amount">
                  Pay now: <strong>{advanceLabel}</strong>
                </p>
                <p className="course-pay-meta">
                  {program.name} · fee {feeLabel}, GST extra. Balance{" "}
                  {courseEnrollmentPriceLabel(program.priceInr - program.advanceInr)}{" "}
                  before class 1. Cohort:{" "}
                  <strong>
                    {courseCohorts.find((item) => item.id === cohort)?.label}
                  </strong>{" "}
                  · {program.sessionTimeLabel}
                </p>

                <RazorpayPayFrame
                  amountInr={program.advanceInr}
                  description={`${program.name} seat advance`}
                  email={email}
                  phone={phone}
                />

                <div className="course-pay-actions">
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
                    Razorpay is filled with {advanceLabel} (half the fee). GST is extra.
                    After we confirm this receipt, book your slots. The balance is
                    due before class 1. Share the receipt on WhatsApp.
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
                  all {program.totalClasses}{" "}
                  <strong>
                    {courseCohorts.find((item) => item.id === cohort)?.label}
                  </strong>{" "}
                  slots ({program.sessionTimeLabel}).
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
                      programId,
                      enrollmentId: enrollmentId ?? undefined,
                    }),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open WhatsApp · share screenshot
                </a>
                <a
                  className="btn-secondary btn-block"
                  href={COURSE_GOOGLE_CALENDAR_BOOKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Book slots on Google Calendar
                </a>
                {bookingToken ? (
                  <a
                    className="btn-secondary btn-block"
                    href={`/courses/book-slots?token=${bookingToken}`}
                  >
                    Open booking page (calendar + status)
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
