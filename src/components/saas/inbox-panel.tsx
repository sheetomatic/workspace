"use client";

import {
  Bot,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Tag,
  User,
  UserCheck,
} from "lucide-react";
import { useState } from "react";

type Conversation = {
  id: string;
  name: string;
  preview: string;
  intent: string;
  time: string;
  unread?: boolean;
  tags: string[];
  phone: string;
  source: string;
  aiEnabled: boolean;
  confidence?: number;
  assignedTo?: string;
};

type Message = {
  id: string;
  direction: "inbound" | "outbound" | "ai";
  text: string;
  time: string;
  confidence?: number;
  sourceDoc?: string;
};

const conversations: Conversation[] = [
  {
    id: "1",
    name: "Rahul Mehta",
    preview: "Yes, tomorrow 11 AM works for a demo.",
    intent: "Sales",
    time: "2m",
    unread: true,
    tags: ["Hot lead", "Pricing"],
    phone: "+91 98765 43210",
    source: "WhatsApp campaign",
    aiEnabled: false,
    confidence: 96,
    assignedTo: "You",
  },
  {
    id: "2",
    name: "Anita Sharma",
    preview: "Where is my order #4821?",
    intent: "Support",
    time: "8m",
    tags: ["Order status"],
    phone: "+91 91234 56789",
    source: "Website widget",
    aiEnabled: true,
    confidence: 91,
  },
  {
    id: "3",
    name: "Vikram Patel",
    preview: "Can I book a site visit this weekend?",
    intent: "Booking",
    time: "14m",
    tags: ["Real estate"],
    phone: "+91 99887 76655",
    source: "WhatsApp inbound",
    aiEnabled: true,
    confidence: 88,
  },
  {
    id: "4",
    name: "Priya Nair",
    preview: "Do you support Tamil replies?",
    intent: "General",
    time: "22m",
    tags: ["Multilingual"],
    phone: "+91 90001 12233",
    source: "Referral",
    aiEnabled: true,
    confidence: 94,
  },
];

const messagesByConversation: Record<string, Message[]> = {
  "1": [
    {
      id: "m1",
      direction: "inbound",
      text: "Hi, I need pricing for your automation package.",
      time: "10:12 AM",
    },
    {
      id: "m2",
      direction: "ai",
      text: "Hello Rahul! AI full access starts at ₹4,999/month, or Task-only from ₹2,500/user/year. Would you like a demo?",
      time: "10:12 AM",
      confidence: 96,
      sourceDoc: "Pricing FAQ.pdf",
    },
    {
      id: "m3",
      direction: "inbound",
      text: "Yes, tomorrow 11 AM works for a demo.",
      time: "10:14 AM",
    },
    {
      id: "m4",
      direction: "outbound",
      text: "Booked. Our team will confirm on WhatsApp shortly.",
      time: "10:15 AM",
    },
  ],
  "2": [
    {
      id: "m5",
      direction: "inbound",
      text: "Where is my order #4821?",
      time: "9:58 AM",
    },
    {
      id: "m6",
      direction: "ai",
      text: "Your order #4821 is out for delivery and should arrive today by 6 PM.",
      time: "9:58 AM",
      confidence: 91,
      sourceDoc: "Order tracking API",
    },
  ],
  "3": [
    {
      id: "m7",
      direction: "inbound",
      text: "Can I book a site visit this weekend?",
      time: "9:42 AM",
    },
    {
      id: "m8",
      direction: "ai",
      text: "Yes. We have slots on Saturday 11 AM and 4 PM. Which works for you?",
      time: "9:42 AM",
      confidence: 88,
      sourceDoc: "Appointment policy",
    },
  ],
  "4": [
    {
      id: "m9",
      direction: "inbound",
      text: "Do you support Tamil replies?",
      time: "9:30 AM",
    },
    {
      id: "m10",
      direction: "ai",
      text: "Yes, our AI can reply in Tamil, Hindi, and English based on customer language.",
      time: "9:30 AM",
      confidence: 94,
      sourceDoc: "Multilingual settings",
    },
  ],
};

export function InboxPanel() {
  const [activeId, setActiveId] = useState("1");
  const [humanTakeover, setHumanTakeover] = useState(false);
  const [draft, setDraft] = useState("");

  const active = conversations.find((item) => item.id === activeId) ?? conversations[0];
  const messages = messagesByConversation[active.id] ?? [];

  return (
    <div className="ws-inbox-shell">
      <aside className="ws-inbox-list" aria-label="Conversations">
        <div className="ws-inbox-list-head">
          <div>
            <h2>WhatsApp Inbox</h2>
            <p>{conversations.length} open conversations</p>
          </div>
          <button className="ws-inbox-icon-btn" type="button" aria-label="More">
            <MoreHorizontal size={18} />
          </button>
        </div>
        <label className="ws-inbox-search">
          <Search size={16} aria-hidden />
          <input placeholder="Search name, phone, or tag" type="search" />
        </label>
        <div className="ws-inbox-filters">
          <button className="is-active" type="button">
            All
          </button>
          <button type="button">Unassigned</button>
          <button type="button">AI handled</button>
          <button type="button">Needs human</button>
        </div>
        <ul className="ws-inbox-threads">
          {conversations.map((thread) => (
            <li key={thread.id}>
              <button
                className={
                  thread.id === activeId
                    ? "ws-inbox-thread is-active"
                    : "ws-inbox-thread"
                }
                type="button"
                onClick={() => setActiveId(thread.id)}
              >
                <span className="ws-inbox-thread-avatar" aria-hidden>
                  {thread.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <span className="ws-inbox-thread-body">
                  <span className="ws-inbox-thread-top">
                    <strong>{thread.name}</strong>
                    <span>{thread.time}</span>
                  </span>
                  <span className="ws-inbox-thread-preview">{thread.preview}</span>
                  <span className="ws-inbox-thread-meta">
                    <span className="ws-inbox-intent">{thread.intent}</span>
                    {thread.unread ? (
                      <span className="ws-inbox-unread" aria-label="Unread" />
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="ws-inbox-chat" aria-label="Chat thread">
        <header className="ws-inbox-chat-head">
          <div>
            <strong>{active.name}</strong>
            <span>{active.phone}</span>
          </div>
          <div className="ws-inbox-chat-actions">
            <span className="ws-inbox-status-pill live">
              <MessageCircle size={12} aria-hidden />
              WhatsApp
            </span>
            <button className="ws-inbox-icon-btn" type="button" aria-label="Assign">
              <UserCheck size={18} />
            </button>
          </div>
        </header>

        <div className="ws-inbox-messages">
          {messages.map((message) => (
            <article
              className={`ws-inbox-bubble ${message.direction}`}
              key={message.id}
            >
              {message.direction === "ai" ? (
                <span className="ws-inbox-ai-tag">
                  <Bot size={12} aria-hidden />
                  AI reply
                  {message.confidence ? ` - ${message.confidence}% confidence` : ""}
                </span>
              ) : null}
              <p>{message.text}</p>
              <footer>
                <time>{message.time}</time>
                {message.sourceDoc ? (
                  <span className="ws-inbox-source">Source: {message.sourceDoc}</span>
                ) : null}
              </footer>
            </article>
          ))}
        </div>

        <footer className="ws-inbox-compose">
          <div className="ws-inbox-compose-tools">
            <button className="ws-inbox-icon-btn" type="button" aria-label="Attach">
              <Paperclip size={18} />
            </button>
            <label className="ws-inbox-toggle">
              <input
                checked={humanTakeover}
                type="checkbox"
                onChange={(event) => setHumanTakeover(event.target.checked)}
              />
              <span>Human takeover</span>
            </label>
          </div>
          <div className="ws-inbox-compose-row">
            <textarea
              placeholder={
                humanTakeover
                  ? "Reply as agent..."
                  : "AI is active. Enable human takeover to reply manually."
              }
              rows={2}
              value={draft}
              disabled={!humanTakeover}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              className="ws-inbox-send"
              disabled={!humanTakeover || !draft.trim()}
              type="button"
            >
              <Send size={18} />
              Send
            </button>
          </div>
        </footer>
      </section>

      <aside className="ws-inbox-context" aria-label="Contact details">
        <div className="ws-inbox-context-card">
          <div className="ws-inbox-contact-head">
            <span className="ws-inbox-thread-avatar lg" aria-hidden>
              {active.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
            <div>
              <strong>{active.name}</strong>
              <span>{active.phone}</span>
            </div>
          </div>
          <dl className="ws-inbox-detail-list">
            <div>
              <dt>Intent</dt>
              <dd>{active.intent}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{active.source}</dd>
            </div>
            <div>
              <dt>Assigned to</dt>
              <dd>{active.assignedTo ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt>AI status</dt>
              <dd>{active.aiEnabled ? "AI active" : "Human handling"}</dd>
            </div>
            {active.confidence ? (
              <div>
                <dt>AI confidence</dt>
                <dd>{active.confidence}%</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="ws-inbox-context-card">
          <div className="ws-inbox-card-head">
            <Tag size={16} aria-hidden />
            <strong>Tags</strong>
          </div>
          <div className="ws-inbox-tag-list">
            {active.tags.map((tag) => (
              <span className="ws-inbox-tag" key={tag}>
                {tag}
              </span>
            ))}
            <button className="ws-inbox-tag add" type="button">
              + Add tag
            </button>
          </div>
        </div>

        <div className="ws-inbox-context-card">
          <div className="ws-inbox-card-head">
            <User size={16} aria-hidden />
            <strong>Notes</strong>
          </div>
          <p className="ws-inbox-note">
            Interested in AI Growth plan. Follow up after demo call.
          </p>
          <button className="ws-inbox-text-btn" type="button">
            Add note
          </button>
        </div>
      </aside>
    </div>
  );
}
