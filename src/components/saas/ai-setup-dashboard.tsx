"use client";

import { ArrowRight, BookOpen, Headphones, Plug, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import type { AiOnboardingAnswers } from "@/lib/ai-onboarding-storage";

type SetupTask = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Plug;
  done: boolean;
};

export function AiSetupDashboard({
  answers,
  integrationsConnected,
  knowledgeReady,
  isLive,
}: {
  answers: AiOnboardingAnswers | null;
  integrationsConnected?: boolean;
  /** At least one training source (FAQ preferred). */
  knowledgeReady?: boolean;
  isLive?: boolean;
}) {
  const tasks: SetupTask[] = useMemo(
    () => [
      {
        id: "train",
        title: "Train",
        description: "Add FAQs so the AI can answer customers.",
        href: "/ai/app/knowledge",
        icon: BookOpen,
        done: Boolean(knowledgeReady),
      },
      {
        id: "connect",
        title: "Connect WhatsApp",
        description:
          "Save Sheetomatic WhatsApp API key and Phone ID for your business number.",
        href: "/ai/app/settings",
        icon: Plug,
        done: Boolean(integrationsConnected),
      },
      {
        id: "golive",
        title: "Go Live",
        description:
          "Register webhook, add team numbers, and turn on AI replies.",
        href: "/ai/app/campaign",
        icon: Zap,
        done: Boolean(isLive),
      },
    ],
    [integrationsConnected, isLive, knowledgeReady],
  );

  const completedCount = tasks.filter((task) => task.done).length;
  const progress = Math.round((completedCount / tasks.length) * 100);
  const nextTask = tasks.find((task) => !task.done) ?? tasks[0];

  return (
    <div className="ai-setup-page">
      <div className="ai-setup-intro">
        <h1>Train → Connect → Go Live</h1>
        <p>Three steps to launch your WhatsApp AI chatbot.</p>
        {answers ? (
          <p className="ai-setup-context">
            Configuring for <strong>{answers.businessName}</strong>
            {answers.industry ? (
              <> in {answers.industry.toLowerCase()}</>
            ) : null}
            .
          </p>
        ) : null}
      </div>

      <section className="ai-setup-card">
        <div className="ai-setup-card-head">
          <span className="ai-setup-ring" aria-hidden>
            <svg viewBox="0 0 36 36">
              <circle cx="18" cy="18" fill="none" r="15" stroke="#e2e8f0" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                fill="none"
                r="15"
                stroke="#111827"
                strokeDasharray={`${progress} 100`}
                strokeLinecap="round"
                strokeWidth="3"
                transform="rotate(-90 18 18)"
              />
            </svg>
          </span>
          <div>
            <h2>You&apos;re almost ready</h2>
            <p>
              {progress}% complete - finish setup to go live.
            </p>
          </div>
        </div>

        <ol className="ai-setup-task-list">
          {tasks.map((task, index) => {
            const Icon = task.icon;
            return (
              <li className={task.done ? "is-done" : undefined} key={task.id}>
                <span className="ai-setup-task-index">{index + 1}</span>
                <span className="ai-setup-task-icon" aria-hidden>
                  <Icon size={18} />
                </span>
                <div className="ai-setup-task-copy">
                  <strong>{task.title}</strong>
                  <span>{task.description}</span>
                </div>
                {task.done ? (
                  <span className="ai-setup-task-status">Done</span>
                ) : (
                  <Link className="ai-setup-task-link" href={task.href}>
                    Open
                  </Link>
                )}
              </li>
            );
          })}
        </ol>

        <div className="ai-setup-card-foot">
          <Link className="ai-setup-help" href="/contact">
            <Headphones size={16} aria-hidden />
            Need help with setup?
          </Link>
          <Link className="ai-setup-start-btn" href={nextTask.href}>
            Continue setup
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
