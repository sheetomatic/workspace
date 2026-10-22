"use client";

import {
  BarChart3,
  BellRing,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  Mail,
  MessageCircleWarning,
  Workflow,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const rolloutSteps = [
  {
    icon: FileSpreadsheet,
    number: "01",
    eyebrow: "The starting point",
    title: "Papers, Excel, Sheets, and chats come in",
    text: "We bring scattered updates, files, and messages into one connected operating flow.",
    result: "Unstructured data is now entering one system.",
  },
  {
    icon: Workflow,
    number: "02",
    eyebrow: "Make it usable",
    title: "The system processes the data",
    text: "Every update is sorted into the right workflow, owner, task, and status instead of staying in chat.",
    result: "Work starts moving through a defined process.",
  },
  {
    icon: ListChecks,
    number: "03",
    eyebrow: "Daily rhythm",
    title: "Your team starts following the process",
    text: "Each person sees what they own, what is due next, and what needs proof before work can move forward.",
    result: "Every task now has an owner and a live status.",
  },
  {
    icon: BellRing,
    number: "04",
    eyebrow: "No follow-up chasing",
    title: "The team receives automatic reminders",
    text: "The system follows up on overdue tasks and handoffs, so owners no longer need to remember every reminder.",
    result: "The right people are reminded at the right time.",
  },
  {
    icon: Database,
    number: "05",
    eyebrow: "One source of truth",
    title: "Complete operating data is collected",
    text: "Tasks, approvals, delays, stock, follow-ups, and proofs are captured as the team works.",
    result: "Nothing important stays hidden in a personal chat or sheet.",
  },
  {
    icon: MessageCircleWarning,
    number: "06",
    eyebrow: "Customers stay informed",
    title: "Client alerts go on WhatsApp",
    text: "Important order, payment, service, or delivery updates reach clients automatically on official WhatsApp.",
    result: "Clients get timely updates without manual copy-paste.",
  },
  {
    icon: BarChart3,
    number: "07",
    eyebrow: "The numbers assemble themselves",
    title: "Reports build automatically",
    text: "Live activity becomes clear performance, pending-work, and exception reports without Sunday spreadsheet preparation.",
    result: "Your reports are ready from the work already completed.",
  },
  {
    icon: Mail,
    number: "08",
    eyebrow: "Updates reach the right people",
    title: "Reports send on WhatsApp and email",
    text: "Managers, owners, and clients receive the reports or alerts they need on the channels they actually use.",
    result: "The right update reaches the right person automatically.",
  },
  {
    icon: LayoutDashboard,
    number: "09",
    eyebrow: "Control is live",
    title: "Admin and user dashboards run the business",
    text: "Admins see the full operation. Every user sees their own tasks, progress, and next actions on desktop and phone.",
    result: "A live operating system your whole team can use every day.",
  },
] as const;

export function SystemLaunchSequence() {
  const sectionRef = useRef<HTMLElement>(null);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [reachedStep, setReachedStep] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.unobserve(section);
      },
      { threshold: 0.22 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const steps = stepRefs.current.filter((step): step is HTMLLIElement => Boolean(step));
    if (!steps.length) return;

    const updateActiveStep = () => {
      const screenAnchor = window.innerHeight * 0.44;
      const nextStep = steps.reduce((closestIndex, step, index) => {
        const currentDistance = Math.abs(step.getBoundingClientRect().top - screenAnchor);
        const closestDistance = Math.abs(
          steps[closestIndex].getBoundingClientRect().top - screenAnchor,
        );
        return currentDistance < closestDistance ? index : closestIndex;
      }, 0);

      setActiveStep(nextStep);
      setReachedStep((current) => Math.max(current, nextStep));
    };

    updateActiveStep();
    window.addEventListener("scroll", updateActiveStep, { passive: true });
    window.addEventListener("resize", updateActiveStep);
    return () => {
      window.removeEventListener("scroll", updateActiveStep);
      window.removeEventListener("resize", updateActiveStep);
    };
  }, []);

  return (
    <section
      id="bci-framework"
      className={`system-launch section${isVisible ? " is-visible" : ""}`}
      aria-labelledby="system-launch-title"
      ref={sectionRef}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="system-launch-head">
          <p className="type-kicker">A simple rollout</p>
          <h2 id="system-launch-title">From scattered work to live control.</h2>
          <p>
            We map the work, build the right system, train your people, and stay
            with you until it becomes part of daily work.
          </p>
        </div>

        <div className="system-launch-scroll">
          <ol className="system-launch-steps">
            {rolloutSteps.map(({ icon: Icon, number, eyebrow, title, text }, index) => (
              <li
                className={`${activeStep === index ? "is-active " : ""}${index <= reachedStep ? "is-revealed" : ""}`}
                data-step={index}
                key={number}
                ref={(node) => { stepRefs.current[index] = node; }}
              >
                <span className="system-launch-icon"><Icon size={22} aria-hidden /></span>
                <span className="system-launch-number">{number}</span>
                <p className="system-launch-step-eyebrow">{eyebrow}</p>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>

      </div>
    </section>
  );
}
