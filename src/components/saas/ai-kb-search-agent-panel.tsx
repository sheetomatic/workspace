"use client";

import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { useState } from "react";
import { AiKnowledgeInstructionPanel } from "@/components/saas/ai-knowledge-instruction-panel";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import { AI_KNOWLEDGE_OVERVIEW } from "@/lib/ai-knowledge-instructions";

type AgentTab = "tasks" | "access" | "behaviour" | "ai-config";

export function AiKbSearchAgentPanel({
  isLive,
  knowledgeSources,
}: {
  isLive: boolean;
  knowledgeSources: number;
}) {
  const [tab, setTab] = useState<AgentTab>("tasks");
  const mission =
    "Answer user queries based on knowledge base using search functions and guardrails";

  return (
    <div className="ai-joyz-agent-page">
      <div className="ai-joyz-agent-head">
        <Link className="ai-joyz-back-btn" href="/ai/app/ai-brain">
          <ArrowLeft size={18} aria-hidden />
        </Link>
        <div className="ai-joyz-agent-title-wrap">
          <h1>
            <SheetomaticAiMark sizes="sm" />
            Kb Search Agent (System default)
          </h1>
          <span className={`ai-joyz-live-badge${isLive ? " is-live" : ""}`}>
            <span aria-hidden className="ai-joyz-live-dot" />
            {isLive ? "Live" : "Draft"}
          </span>
        </div>
        <Link className="ai-joyz-draft-btn" href="/ai/app/knowledge">
          Edit training
        </Link>
      </div>

      <section className="ai-joyz-agent-section">
        <h2>
          What should this agent do?
          <CircleHelp size={15} aria-hidden />
        </h2>
        <textarea
          className="ai-joyz-agent-mission"
          readOnly
          rows={3}
          value={mission}
        />
      </section>

      <div className="ai-joyz-pill-tabs ai-joyz-agent-tabs" role="tablist">
        {(
          [
            ["tasks", "Tasks"],
            ["access", "Access"],
            ["behaviour", "Behaviour"],
            ["ai-config", "AI Config"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            aria-selected={tab === id}
            className={`ai-joyz-pill-tab${tab === id ? " is-active" : ""}`}
            role="tab"
            type="button"
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "tasks" ? (
        <>
          <AiKnowledgeInstructionPanel block={AI_KNOWLEDGE_OVERVIEW} compact />
          <section className="ai-joyz-agent-card">
          <h3>How should the agent handle the conversation?</h3>
          <p>
            This system agent is designed to interact with your knowledge base. It
            automatically searches for and retrieves relevant articles to assist in
            responding to user queries on WhatsApp.
          </p>
          <p className="ai-joyz-agent-note">
            You can create custom agents with more specific instructions and actions to
            better suit your needs. For now, train this agent from{" "}
            <Link href="/ai/app/knowledge">AI Training Data</Link> ({knowledgeSources}{" "}
            active source{knowledgeSources === 1 ? "" : "s"}).
          </p>
        </section>
        </>
      ) : null}

      {tab === "access" ? (
        <section className="ai-joyz-agent-card">
          <h3>Who can use this agent?</h3>
          <p>
            The KB Search Agent replies to all inbound WhatsApp conversations when AI is
            live on your business number. Team members can take over from the inbox at any
            time.
          </p>
          <Link className="btn-cta btn-secondary" href="/ai/app/inbox">
            Open Chats
          </Link>
        </section>
      ) : null}

      {tab === "behaviour" ? (
        <section className="ai-joyz-agent-card">
          <h3>Conversation behaviour</h3>
          <ul className="ai-joyz-agent-list">
            <li>Search training data before answering customer questions.</li>
            <li>Cite the source article used in inbox replies when available.</li>
            <li>Escalate to your team when no matching article is found.</li>
            <li>Follow WhatsApp template and session rules from Campaign settings.</li>
          </ul>
          <Link className="btn-cta btn-secondary" href="/ai/app/campaign">
            Open Campaign
          </Link>
        </section>
      ) : null}

      {tab === "ai-config" ? (
        <section className="ai-joyz-agent-card">
          <h3>AI configuration</h3>
          <p>
            Model and reply settings are managed at the workspace level. Connect RedLava,
            add training data, then go live from Campaign.
          </p>
          <div className="ai-joyz-agent-links">
            <Link className="btn-cta btn-secondary" href="/ai/app/settings">
              Open Settings
            </Link>
            <Link className="btn-cta btn-ghost" href="/ai/app/knowledge">
              Manage training data
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
