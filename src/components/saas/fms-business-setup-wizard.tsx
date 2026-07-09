"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Factory } from "lucide-react";
import {
  BUSINESS_TYPE_PROFILES,
  type BusinessTypeProfile,
} from "@/lib/fms/business-setup";
import {
  provisionBusinessProcesses,
  type BusinessSetupResult,
} from "@/app/app/fms/setup/business/actions";

type WizardStep = "type" | "industry" | "processes" | "done";

export function FmsBusinessSetupWizard() {
  const [step, setStep] = useState<WizardStep>("type");
  const [businessTypeId, setBusinessTypeId] = useState<string | null>(null);
  const [industry, setIndustry] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BusinessSetupResult | null>(null);
  const [pending, startTransition] = useTransition();

  const profile: BusinessTypeProfile | null = useMemo(
    () =>
      BUSINESS_TYPE_PROFILES.find((item) => item.id === businessTypeId) ?? null,
    [businessTypeId],
  );

  const chooseType = (id: string) => {
    setBusinessTypeId(id);
    const nextProfile = BUSINESS_TYPE_PROFILES.find((item) => item.id === id);
    setSelected(
      new Set(
        (nextProfile?.processes ?? [])
          .filter((process) => process.recommended)
          .map((process) => process.presetId),
      ),
    );
    setStep("industry");
  };

  const toggleProcess = (presetId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(presetId)) {
        next.delete(presetId);
      } else {
        next.add(presetId);
      }
      return next;
    });
  };

  const submit = () => {
    if (!businessTypeId) {
      return;
    }
    startTransition(async () => {
      const response = await provisionBusinessProcesses({
        businessTypeId,
        industry,
        presetIds: Array.from(selected),
      });
      setResult(response);
      if (response.ok) {
        setStep("done");
      }
    });
  };

  if (step === "done" && result?.ok) {
    return (
      <section className="fms-biz-wizard" aria-label="Setup complete">
        <div className="fms-biz-done">
          <span className="fms-biz-done-icon" aria-hidden>
            <Check size={22} />
          </span>
          <h2>Your process FMS setup is live</h2>
          <p>{result.message}</p>
          <ul className="fms-biz-done-list">
            {result.provisioned.map((item) => (
              <li key={item.presetId}>{item.templateName}</li>
            ))}
          </ul>
          <div className="fms-biz-actions">
            <Link href="/app/fms/fulfillment" className="btn-primary btn-sm ws-sf-btn-primary">
              Open process FMS board
            </Link>
            <Link href="/app/fms/setup" className="btn-secondary btn-sm">
              Customize steps in Setup
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="fms-biz-wizard" aria-label="Business setup wizard">
      <ol className="fms-biz-steps" aria-hidden>
        <li className={step === "type" ? "is-active" : "is-done"}>Business type</li>
        <li
          className={
            step === "industry" ? "is-active" : step === "processes" ? "is-done" : ""
          }
        >
          Industry
        </li>
        <li className={step === "processes" ? "is-active" : ""}>Processes</li>
      </ol>

      {step === "type" ? (
        <div className="fms-biz-type-grid">
          {BUSINESS_TYPE_PROFILES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`fms-biz-type-card${businessTypeId === item.id ? " is-selected" : ""}`}
              onClick={() => chooseType(item.id)}
            >
              <Factory size={18} aria-hidden />
              <strong>{item.label}</strong>
              <p>{item.description}</p>
              <span className="fms-biz-type-examples">
                {item.exampleIndustries.slice(0, 3).join(" · ")}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {step === "industry" && profile ? (
        <div className="fms-biz-panel">
          <h2>What do you {profile.id === "services" ? "do" : "make or sell"}?</h2>
          <p className="fms-biz-hint">
            e.g. {profile.exampleIndustries.join(", ")}
          </p>
          <input
            type="text"
            className="fms-biz-industry-input"
            placeholder={`Your industry (e.g. ${profile.exampleIndustries[0]})`}
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
          />
          <div className="fms-biz-chip-row">
            {profile.exampleIndustries.map((example) => (
              <button
                key={example}
                type="button"
                className={`fms-biz-chip${industry === example ? " is-selected" : ""}`}
                onClick={() => setIndustry(example)}
              >
                {example}
              </button>
            ))}
          </div>
          <div className="fms-biz-actions">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setStep("type")}
            >
              <ArrowLeft size={14} aria-hidden />
              Back
            </button>
            <button
              type="button"
              className="btn-primary btn-sm ws-sf-btn-primary"
              onClick={() => setStep("processes")}
            >
              Choose processes
              <ArrowRight size={14} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      {step === "processes" && profile ? (
        <div className="fms-biz-panel">
          <h2>
            Processes for {industry.trim() || profile.label}
          </h2>
          <p className="fms-biz-hint">
            Each selected process becomes its own FMS — status, owner, and time
            delay tracked per order. Recommended ones are pre-selected.
          </p>
          <ul className="fms-biz-process-list">
            {profile.processes.map((process) => {
              const checked = selected.has(process.presetId);
              return (
                <li key={process.presetId}>
                  <label
                    className={`fms-biz-process-row${checked ? " is-selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProcess(process.presetId)}
                    />
                    <span className="fms-biz-process-name">
                      {process.label}
                      {process.recommended ? (
                        <em className="fms-biz-recommended">Recommended</em>
                      ) : null}
                    </span>
                    <span className="fms-biz-process-area">{process.processArea}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {result && !result.ok ? (
            <p className="fms-biz-error" role="alert">
              {result.message}
            </p>
          ) : null}
          <div className="fms-biz-actions">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setStep("industry")}
              disabled={pending}
            >
              <ArrowLeft size={14} aria-hidden />
              Back
            </button>
            <button
              type="button"
              className="btn-primary btn-sm ws-sf-btn-primary"
              onClick={submit}
              disabled={pending || selected.size === 0}
            >
              {pending
                ? "Setting up…"
                : `Set up ${selected.size} process FMS`}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
