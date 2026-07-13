"use client";

import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeAiOnboarding } from "@/app/ai/app/onboarding/actions";
import { saveAiOnboardingAnswers } from "@/lib/ai-onboarding-storage";

const industries = [
  "Ecommerce",
  "Real Estate",
  "Healthcare",
  "Travel",
  "Education",
  "SaaS",
  "Logistics",
  "Other",
];

type FormState = {
  businessName: string;
  industry: string;
};

export function AiOnboardingFlow({
  defaultBusinessName,
}: {
  defaultBusinessName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>({
    businessName: defaultBusinessName,
    industry: "",
  });

  const isBusinessStep = stepIndex === 0;
  const progress = Math.round(((stepIndex + 1) / 2) * 100);

  function canContinue() {
    if (isBusinessStep) {
      return form.businessName.trim().length > 0;
    }
    return true;
  }

  function finish() {
    startTransition(async () => {
      saveAiOnboardingAnswers({
        businessName: form.businessName.trim(),
        industry: form.industry || "Other",
        primaryGoal: "Answer customer support questions",
        teamSize: "Just me",
        whatsappStatus: "Not sure yet",
      });
      await completeAiOnboarding({
        businessName: form.businessName.trim(),
        industry: form.industry || "Other",
      });
      router.replace("/ai/app/knowledge");
    });
  }

  function goNext() {
    if (!canContinue()) {
      return;
    }
    if (stepIndex >= 1) {
      finish();
      return;
    }
    setStepIndex(1);
  }

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  return (
    <div className="ai-onboarding-page">
      <div className="ai-onboarding-card">
        <div className="ai-onboarding-progress-head">
          <span>Quick setup</span>
          <strong>{progress}%</strong>
        </div>
        <div className="ai-onboarding-progress-bar">
          <span style={{ width: `${progress}%` }} />
        </div>

        <p className="ai-onboarding-step-count">
          Step {stepIndex + 1} of 2
        </p>

        {isBusinessStep ? (
          <>
            <h1>What is your business name?</h1>
            <p className="ai-onboarding-lead">
              We will use this in your AI replies. Next: train → connect → go live.
            </p>
            <label className="ai-onboarding-field">
              Business name
              <input
                autoFocus
                value={form.businessName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    businessName: event.target.value,
                  }))
                }
                placeholder="Your company name"
              />
            </label>
          </>
        ) : (
          <>
            <h1>Which industry best describes you?</h1>
            <p className="ai-onboarding-lead">
              Optional — skip if you are not sure. You can train FAQs next.
            </p>
            <div className="ai-onboarding-options">
              {industries.map((option) => {
                const selected = form.industry === option;
                return (
                  <button
                    className={selected ? "is-selected" : undefined}
                    key={option}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        industry: option,
                      }))
                    }
                  >
                    {selected ? <CheckCircle2 aria-hidden size={16} /> : null}
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="ai-onboarding-actions">
          <button
            className="ai-onboarding-back"
            disabled={stepIndex === 0}
            type="button"
            onClick={goBack}
          >
            <ArrowLeft size={16} aria-hidden />
            Back
          </button>
          <button
            className="ai-onboarding-next"
            disabled={!canContinue() || pending}
            type="button"
            onClick={goNext}
          >
            {pending
              ? "Saving..."
              : stepIndex >= 1
                ? "Start training"
                : "Continue"}
            <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
