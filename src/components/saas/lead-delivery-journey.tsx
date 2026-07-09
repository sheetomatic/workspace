"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, CircleDashed } from "lucide-react";
import {
  buildDeliveryJourney,
  buildFulfillmentJourney,
  buildPreSalesJourney,
  deliveryJourneySummary,
  getDeliveryNextAction,
  getDeliveryPipelineMode,
  getDeliveryProgress,
  getDeliveryStepDetail,
  type DeliveryLeadTab,
  type LeadDeliveryInput,
} from "@/lib/leads/delivery-journey";

export function LeadDeliveryJourney({
  lead,
  variant = "drawer",
  onGoToLeadTab,
}: {
  lead: LeadDeliveryInput;
  variant?: "drawer" | "full";
  onGoToLeadTab?: (tab: DeliveryLeadTab) => void;
}) {
  const mode =
    variant === "full" ? "full" : getDeliveryPipelineMode(lead);
  const steps =
    variant === "full"
      ? buildDeliveryJourney(lead)
      : mode === "pre_sales"
        ? buildPreSalesJourney(lead)
        : buildFulfillmentJourney(lead);

  const summary =
    variant === "drawer" && mode === "pre_sales"
      ? (() => {
          const active = steps.find((step) => step.state === "active");
          return active ? `${active.label}: ${active.statusLabel}` : "Pre-sales";
        })()
      : deliveryJourneySummary(buildDeliveryJourney(lead));

  const activeStep = steps.find((step) => step.state === "active");
  const nextAction = getDeliveryNextAction(steps, lead.salesOrder?.id, mode);
  const progress = getDeliveryProgress(steps);
  const stepDetail = getDeliveryStepDetail(activeStep);

  const primaryButton =
    nextAction.leadTab && onGoToLeadTab ? (
      <button
        type="button"
        className="btn-primary btn-sm delivery-next-btn"
        onClick={() => onGoToLeadTab(nextAction.leadTab!)}
      >
        {nextAction.primaryLabel}
        <ArrowRight size={14} aria-hidden />
      </button>
    ) : (
      <Link
        href={nextAction.href ?? "/app/sales-orders"}
        className="btn-primary btn-sm delivery-next-btn"
      >
        {nextAction.primaryLabel}
        <ArrowRight size={14} aria-hidden />
      </Link>
    );

  return (
    <section
      className={`delivery-board delivery-board-${variant}`}
      aria-label={mode === "pre_sales" ? "Pre-sales pipeline" : "Fulfillment pipeline"}
    >
      <div className="delivery-board-top">
        <div className="delivery-board-phase">
          <span className={`delivery-phase-tag is-${nextAction.phase}`}>
            {nextAction.phaseLabel}
          </span>
          <p className="delivery-board-summary">{summary}</p>
        </div>
        <span className="delivery-board-progress">
          Step {progress.current} of {progress.total}
        </span>
      </div>

      <ol className="delivery-pipeline" aria-label="Pipeline stages">
        {steps.map((step) => (
          <li
            key={step.key}
            className={`delivery-pipeline-step is-${step.state}`}
            aria-current={step.state === "active" ? "step" : undefined}
            title={`${step.label}: ${step.statusLabel}`}
          >
            <span className="delivery-pipeline-icon" aria-hidden>
              {step.state === "done" ? (
                <CheckCircle2 size={14} />
              ) : step.state === "active" ? (
                <Circle size={14} strokeWidth={2.5} />
              ) : step.state === "skipped" ? (
                <CircleDashed size={14} />
              ) : (
                <Circle size={14} />
              )}
            </span>
            <span className="delivery-pipeline-label">{step.label}</span>
            <span className="delivery-pipeline-status">{step.statusLabel}</span>
          </li>
        ))}
      </ol>

      <article className="delivery-next-card">
        <p className="delivery-next-eyebrow">Next action</p>
        <h3>{nextAction.title}</h3>
        <p className="delivery-next-copy">{nextAction.description}</p>
        {stepDetail ? (
          <p className="delivery-next-detail">
            {activeStep?.href ? (
              <Link href={activeStep.href}>{stepDetail}</Link>
            ) : (
              stepDetail
            )}
          </p>
        ) : null}
        <div className="delivery-next-actions">{primaryButton}</div>
      </article>

      {variant === "full" ? (
        <details className="delivery-timeline-details">
          <summary>All stage details</summary>
          <ol className="lead-delivery-steps">
            {steps.map((step) => (
              <li
                key={step.key}
                className={`lead-delivery-step is-${step.state}`}
                data-state={step.state}
              >
                <div className="lead-delivery-step-head">
                  <span className="lead-delivery-step-label">{step.label}</span>
                  <span className={`lead-delivery-step-badge is-${step.state}`}>
                    {step.statusLabel}
                  </span>
                </div>
                {getDeliveryStepDetail(step) ? (
                  <p className="lead-delivery-step-detail">
                    {step.href ? (
                      <Link href={step.href}>{getDeliveryStepDetail(step)}</Link>
                    ) : (
                      getDeliveryStepDetail(step)
                    )}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}

export function LeadDeliveryStagePill({ lead }: { lead: LeadDeliveryInput }) {
  const mode = getDeliveryPipelineMode(lead);
  const steps =
    mode === "pre_sales" ? buildPreSalesJourney(lead) : buildFulfillmentJourney(lead);
  const active = steps.find((step) => step.state === "active");
  const label = active?.statusLabel ?? deliveryJourneySummary(buildDeliveryJourney(lead));

  return (
    <span
      className={`lead-delivery-pill${active ? ` is-${active.key}` : ""}`}
      title={deliveryJourneySummary(buildDeliveryJourney(lead))}
    >
      {active?.label ?? "Lead"} · {label}
    </span>
  );
}
