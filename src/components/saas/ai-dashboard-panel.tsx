"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, MessageCircle, Radio, Settings, Users, Zap } from "lucide-react";
import type { AiOnboardingAnswers } from "@/lib/ai-onboarding-storage";

type DashboardStats = {
  organizationName: string;
  contacts: number;
  openConversations: number;
  knowledgeSources: number;
  unreadMessages: number;
  integrationsConnected: boolean;
  isLive: boolean;
};

export function AiDashboardPanel({
  stats,
  answers,
}: {
  stats: DashboardStats;
  answers: AiOnboardingAnswers | null;
}) {
  const setupSteps = [
    {
      id: "settings",
      title: "Connect WhatsApp",
      done: stats.integrationsConnected,
      href: "/ai/app/settings",
    },
    {
      id: "knowledge",
      title: "Add AI training data",
      done: stats.knowledgeSources > 0,
      href: "/ai/app/knowledge",
    },
    {
      id: "campaign",
      title: "Go Live on WhatsApp",
      done: stats.isLive,
      href: "/ai/app/campaign",
    },
  ];

  const completed = setupSteps.filter((step) => step.done).length;
  const progress = Math.round((completed / setupSteps.length) * 100);
  const nextStep = setupSteps.find((step) => !step.done) ?? setupSteps[0];

  return (
    <div className="ai-setup-page">
      <div className="ai-setup-intro">
        <h1>Dashboard</h1>
        <p>
          WhatsApp AI workspace for <strong>{stats.organizationName}</strong>.
        </p>
        {answers ? (
          <p className="ai-setup-context">
            Goal: {answers.primaryGoal.toLowerCase()} - {answers.industry.toLowerCase()}
          </p>
        ) : null}
      </div>

      <div className="ws-wa-stats-row">
        <div className="ws-wa-stat-card">
          <strong>{stats.openConversations}</strong>
          <span>Open chats</span>
        </div>
        <div className="ws-wa-stat-card">
          <strong>{stats.contacts}</strong>
          <span>Contacts</span>
        </div>
        <div className="ws-wa-stat-card">
          <strong>{stats.unreadMessages}</strong>
          <span>Unread</span>
        </div>
        <div className="ws-wa-stat-card">
          <strong>{stats.knowledgeSources}</strong>
          <span>Training sources</span>
        </div>
      </div>

      <div className="ws-product-module-grid">
        <Link className="ws-product-module-card ws-training-feature-card" href="/ai/app/inbox">
          <MessageCircle size={18} />
          <h2>Chats</h2>
          <p>Live WhatsApp inbox and team replies.</p>
        </Link>
        <Link className="ws-product-module-card ws-training-feature-card" href="/ai/app/contacts">
          <Users size={18} />
          <h2>Contacts</h2>
          <p>CRM contacts from WhatsApp leads.</p>
        </Link>
        <Link className="ws-product-module-card ws-training-feature-card" href="/ai/app/knowledge">
          <BookOpen size={18} />
          <h2>AI Training Data</h2>
          <p>FAQs, documents, and website content.</p>
        </Link>
        <Link className="ws-product-module-card ws-training-feature-card" href="/ai/app/settings">
          <Settings size={18} />
          <h2>Settings</h2>
          <p>WhatsApp API, wallet, and team numbers.</p>
        </Link>
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
                stroke="#15803d"
                strokeDasharray={`${progress} 100`}
                strokeLinecap="round"
                strokeWidth="3"
                transform="rotate(-90 18 18)"
              />
            </svg>
          </span>
          <div>
            <h2>Setup progress</h2>
            <p>{progress}% complete - {stats.isLive ? "AI is live" : "finish setup to go live"}</p>
          </div>
        </div>

        <ol className="ai-setup-task-list">
          {setupSteps.map((step, index) => (
            <li className={step.done ? "is-done" : undefined} key={step.id}>
              <span className="ai-setup-task-index">{index + 1}</span>
              <span className="ai-setup-task-icon" aria-hidden>
                {step.id === "campaign" ? <Zap size={18} /> : step.id === "knowledge" ? <BookOpen size={18} /> : <Radio size={18} />}
              </span>
              <div className="ai-setup-task-copy">
                <strong>{step.title}</strong>
              </div>
              {step.done ? (
                <span className="ai-setup-task-status">Done</span>
              ) : (
                <Link className="ai-setup-task-link" href={step.href}>
                  Open
                </Link>
              )}
            </li>
          ))}
        </ol>

        {!stats.isLive ? (
          <div className="ai-setup-card-foot">
            <Link className="ai-setup-start-btn" href={nextStep.href}>
              Continue setup
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
