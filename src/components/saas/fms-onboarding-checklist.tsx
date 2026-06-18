import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { getFmsOnboardingStatus } from "@/lib/fms/queries";

type OnboardingStatus = Awaited<ReturnType<typeof getFmsOnboardingStatus>>;

const STEPS: Array<{
  key: keyof OnboardingStatus;
  title: string;
  detail: string;
  href?: string;
}> = [
  {
    key: "hasDesign",
    title: "Create a flowchart",
    detail: "Use AI consultant or pick a department template.",
    href: "/app/fms/design/new",
  },
  {
    key: "hasApprovedDesign",
    title: "Get owner approval",
    detail: "Submit the design so the owner can approve and publish.",
    href: "/app/fms/setup",
  },
  {
    key: "hasLiveForm",
    title: "Live form ready",
    detail: "An approved design creates the intake form automatically.",
    href: "/app/fms/setup",
  },
  {
    key: "hasSubmission",
    title: "Run a test submission",
    detail: "Submit the form once to start a pipeline journey.",
    href: "/app/fms/setup",
  },
  {
    key: "hasAssignedOwner",
    title: "Assign step owners",
    detail: "Each stop should have someone responsible before go-live.",
    href: "/app/fms/lines",
  },
];

export function FmsOnboardingChecklist({ status }: { status: OnboardingStatus }) {
  const doneCount = STEPS.filter((step) => status[step.key]).length;
  const allDone = doneCount === STEPS.length;

  if (allDone) {
    return null;
  }

  return (
    <section className="ws-sf-card ws-fms-onboarding" aria-label="Client onboarding checklist">
      <header className="ws-fms-section-heading">
        <h2>Client onboarding</h2>
        <p>
          {doneCount}/{STEPS.length} steps complete before your team goes live.
        </p>
      </header>
      <ol className="ws-fms-onboarding-list">
        {STEPS.map((step) => {
          const done = status[step.key];
          const Icon = done ? CheckCircle2 : Circle;
          const content = (
            <>
              <Icon size={18} aria-hidden className="ws-fms-onboarding-icon" />
              <div>
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
              </div>
              {!done ? <span className="ws-fms-onboarding-cta">Start</span> : null}
            </>
          );

          return (
            <li key={step.key} className={done ? "is-done" : undefined}>
              {!done && step.href ? (
                <Link href={step.href} className="ws-fms-onboarding-item-link">
                  {content}
                </Link>
              ) : (
                <div className="ws-fms-onboarding-item">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
