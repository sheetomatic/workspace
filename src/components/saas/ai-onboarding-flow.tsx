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

const goals = [
  "Capture and qualify leads",
  "Answer customer support questions",
  "Send order and appointment updates",
  "Run WhatsApp marketing campaigns",
];

const teamSizes = ["Just me", "2-5 people", "6-20 people", "20+ people"];

const whatsappStatuses = [
  "Already on WhatsApp Business API",
  "Using WhatsApp Business app only",
  "Need to connect WhatsApp",
  "Not sure yet",
];

type Step = {
  id: string;
  title: string;
  description: string;
  field: keyof FormState;
  options?: string[];
  inputType?: "text" | "choice";
};

type FormState = {
  businessName: string;
  industry: string;
  primaryGoal: string;
  teamSize: string;
  whatsappStatus: string;
};

const steps: Step[] = [
  {
    id: "business",
    title: "What is your business name?",
    description: "We will use this in your AI replies and CRM workspace.",
    field: "businessName",
    inputType: "text",
  },
  {
    id: "industry",
    title: "Which industry best describes you?",
    description: "This helps us suggest the right workflows and templates.",
    field: "industry",
    options: industries,
    inputType: "choice",
  },
  {
    id: "goal",
    title: "What is your main goal with Sheetomatic AI?",
    description: "Pick the outcome you want first - you can add more later.",
    field: "primaryGoal",
    options: goals,
    inputType: "choice",
  },
  {
    id: "team",
    title: "How big is your team?",
    description: "We will recommend inbox and assignment settings for your size.",
    field: "teamSize",
    options: teamSizes,
    inputType: "choice",
  },
  {
    id: "whatsapp",
    title: "Where are you with WhatsApp today?",
    description: "We will guide the right connection path in setup.",
    field: "whatsappStatus",
    options: whatsappStatuses,
    inputType: "choice",
  },
];

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
    primaryGoal: "",
    teamSize: "",
    whatsappStatus: "",
  });

  const step = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const value = form[step.field];

  function canContinue() {
    return value.trim().length > 0;
  }

  function goNext() {
    if (!canContinue()) {
      return;
    }

    if (stepIndex >= steps.length - 1) {
      startTransition(async () => {
        saveAiOnboardingAnswers(form);
        await completeAiOnboarding({
          businessName: form.businessName,
          industry: form.industry,
        });
        router.replace("/ai/app/campaign");
      });
      return;
    }

    setStepIndex((current) => current + 1);
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
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h1>{step.title}</h1>
        <p className="ai-onboarding-lead">{step.description}</p>

        {step.inputType === "text" ? (
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
        ) : (
          <div className="ai-onboarding-options">
            {step.options?.map((option) => {
              const selected = value === option;
              return (
                <button
                  className={selected ? "is-selected" : undefined}
                  key={option}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      [step.field]: option,
                    }))
                  }
                >
                  {selected ? <CheckCircle2 aria-hidden size={16} /> : null}
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
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
              : stepIndex >= steps.length - 1
                ? "Finish setup"
                : "Continue"}
            <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
