import Link from "next/link";
import { Bot, ChevronRight, ClipboardList, MessageSquare } from "lucide-react";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import type { getAiAgentsOverview } from "@/lib/ai-module-data";

type AgentsData = Awaited<ReturnType<typeof getAiAgentsOverview>>;

const AGENTS = [
  {
    id: "kb-search",
    href: "/ai/app/ai-brain/kb-search",
    icon: Bot,
    name: "Knowledge Agent",
    badge: "System",
    description: "Answers customer questions from your AI training data with source citations.",
    tasks: ["Search knowledge base", "Reply on WhatsApp when live", "Hand off when unsure"],
    metric: (d: AgentsData) => `${d.knowledgeSources} training sources`,
    live: (d: AgentsData) => d.isLive,
  },
  {
    id: "lead-capture",
    href: "/ai/app/campaign",
    icon: ClipboardList,
    name: "Lead Capture Agent",
    badge: "Automated",
    description: "Collects name, email, city, and requirement from new WhatsApp leads.",
    tasks: ["5-step profile form", "Promotes to Qualified when complete", "Creates CRM contact"],
    metric: (d: AgentsData) =>
      d.leadCapturePending > 0
        ? `${d.leadCapturePending} profiles in progress`
        : "No pending profiles",
    live: (d: AgentsData) => d.isLive,
  },
  {
    id: "handoff",
    href: "/ai/app/inbox",
    icon: MessageSquare,
    name: "Human Handoff",
    badge: "Team",
    description: "Stops AI for a contact when your team replies - full control in Chats.",
    tasks: ["Disable AI per contact", "Manager takeover", "Resume AI from inbox"],
    metric: (d: AgentsData) =>
      d.lowConfidenceToday > 0
        ? `${d.lowConfidenceToday} low-confidence replies (24h)`
        : `${d.openConversations} open chats`,
    live: () => true,
  },
] as const;

export function AiAgentsPanel({ data }: { data: AgentsData }) {
  return (
    <div className="ai-agents-page">
      <header className="ai-agents-head">
        <span className="ai-agents-head-icon" aria-hidden>
          <SheetomaticAiMark size={22} />
        </span>
        <div>
          <h1>AI Agents</h1>
          <p>
            Active agents that run on your WhatsApp channel. Train knowledge, go live from
            Campaign, and monitor handoffs in Chats.
          </p>
        </div>
        <Link className="ai-agents-head-link" href="/ai/app/knowledge">
          Training data
        </Link>
      </header>

      <div className="ai-agents-stats">
        <article>
          <span>Channel</span>
          <strong>{data.isLive ? "Live" : "Paused"}</strong>
        </article>
        <article>
          <span>Training sources</span>
          <strong>{data.knowledgeSources}</strong>
        </article>
        <article>
          <span>Open chats</span>
          <strong>{data.openConversations}</strong>
        </article>
      </div>

      <div className="ai-agents-list">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          const isLive = agent.live(data);
          return (
            <Link className="ai-agents-row" href={agent.href} key={agent.id}>
              <span className="ai-agents-row-icon" aria-hidden>
                <Icon size={18} />
              </span>
              <div className="ai-agents-row-body">
                <div className="ai-agents-row-title">
                  <strong>{agent.name}</strong>
                  <span className="ai-agents-row-badge">{agent.badge}</span>
                  <span className={`ai-agents-live${isLive ? " is-live" : ""}`}>
                    {isLive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p>{agent.description}</p>
                <ul>
                  {agent.tasks.map((task) => (
                    <li key={task}>{task}</li>
                  ))}
                </ul>
                <span className="ai-agents-row-metric">{agent.metric(data)}</span>
              </div>
              <ChevronRight size={18} aria-hidden className="ai-agents-row-chevron" />
            </Link>
          );
        })}
      </div>

      <p className="ai-agents-foot">
        Custom agents with separate prompts and tools are on the roadmap. Today these three
        agents cover replies, lead capture, and team takeover for MSME WhatsApp sales.
      </p>
    </div>
  );
}
