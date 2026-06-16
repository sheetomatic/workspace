"use client";

import {
  MessageCircle,
  Search,
  Send,
  Tag,
  User,
} from "lucide-react";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type KeyboardEvent } from "react";
import {
  sendInboxReply,
  setInboxHumanTakeover,
} from "@/app/ai/app/inbox/actions";
import { formatWhatsAppPhone } from "@/lib/phone";
import { SCALE } from "@/lib/scale";

export type InboxConversationRow = {
  id: string;
  preview: string | null;
  lastMessageAt: string | null;
  aiHandled: boolean;
  contact: {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    city: string | null;
    requirementDescription: string | null;
    leadCaptureComplete: boolean;
    intent: string | null;
    source: string;
    unreadCount: number;
    aiEnabled: boolean;
    tags: string[];
    notes: string | null;
    assignedToName: string | null;
  };
};

export type InboxMessageRow = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  body: string;
  createdAt: string;
  aiGenerated: boolean;
  aiConfidence: number | null;
  aiSourceTitles: string[];
  senderName: string | null;
};

export function LiveInboxPanel({
  conversations,
  activeConversationId,
  messages,
  emptyHint,
  webhookReceived = true,
  sessionActive = true,
  whatsAppLive = false,
}: {
  conversations: InboxConversationRow[];
  activeConversationId: string | null;
  messages: InboxMessageRow[];
  emptyHint?: string;
  webhookReceived?: boolean;
  sessionActive?: boolean;
  whatsAppLive?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [pauseAi, setPauseAi] = useState(false);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = conversations.filter((thread) => {
    if (!query.trim()) {
      return true;
    }
    const q = query.toLowerCase();
    return (
      thread.contact.name?.toLowerCase().includes(q) ||
      thread.contact.phone.includes(q) ||
      thread.preview?.toLowerCase().includes(q)
    );
  });

  const active =
    conversations.find((item) => item.id === activeConversationId) ??
    filtered[0] ??
    null;

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    const timer = window.setInterval(poll, SCALE.INBOX_CLIENT_POLL_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (!active) {
      return;
    }
    setPauseAi(!active.contact.aiEnabled);
    setFeedback(null);
  }, [active?.id, active?.contact.aiEnabled]);

  function selectConversation(id: string) {
    router.push(`/ai/app/inbox?c=${id}`);
  }

  function formatTime(iso: string | null) {
    if (!iso) {
      return "";
    }
    const date = new Date(iso);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    return sameDay
      ? date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  function sendReply() {
    if (!active || !draft.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await sendInboxReply(active.id, draft);
      setFeedback(result.message);
      if (result.ok) {
        setDraft("");
        setPauseAi(true);
        router.refresh();
      }
    });
  }

  function togglePauseAi(checked: boolean) {
    if (!active) {
      return;
    }

    setPauseAi(checked);
    startTransition(async () => {
      const result = await setInboxHumanTakeover(active.contact.id, checked);
      setFeedback(result.message);
      if (result.ok) {
        router.refresh();
      } else {
        setPauseAi(!checked);
      }
    });
  }

  function handleComposeKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendReply();
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="ws-inbox-empty">
        <MessageCircle size={40} aria-hidden />
        <h2>No WhatsApp chats yet</h2>
        <p>
          {emptyHint ??
            "When customers message your Official WhatsApp number, conversations appear here. You can reply from this inbox."}
        </p>
        {!webhookReceived ? (
          <p className="ws-inbox-empty-note">
            Register the webhook in{" "}
            <Link href="/ai/app/settings#official-api">Settings</Link> and send a
            test message to your business number.
          </p>
        ) : null}
        <Link className="btn-cta btn-primary" href="/ai/app/campaign">
          Open Campaign setup
        </Link>
      </div>
    );
  }

  const displayName = active?.contact.name ?? formatWhatsAppPhone(active?.contact.phone ?? "");
  const initials = (active?.contact.name ?? active?.contact.phone ?? "?")
    .split(/[\s@+]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="ws-inbox-shell">
      <aside className="ws-inbox-list" aria-label="Conversations">
        <div className="ws-inbox-list-head">
          <div>
            <h2>WhatsApp Inbox</h2>
            <p>{filtered.length} live conversation{filtered.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <p className="ws-inbox-list-hint">
          Customer messages on your Official WhatsApp appear here. Type a reply below
          {whatsAppLive ? " — AI auto-replies until you send manually." : "."}
        </p>
        <label className="ws-inbox-search">
          <Search size={16} aria-hidden />
          <input
            placeholder="Search name, phone, or message"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <ul className="ws-inbox-threads">
          {filtered.map((thread) => (
            <li key={thread.id}>
              <button
                className={
                  thread.id === active?.id
                    ? "ws-inbox-thread is-active"
                    : "ws-inbox-thread"
                }
                type="button"
                onClick={() => selectConversation(thread.id)}
              >
                <span className="ws-inbox-thread-avatar" aria-hidden>
                  {(thread.contact.name ?? thread.contact.phone)
                    .split(/[\s@+]+/)
                    .filter(Boolean)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span className="ws-inbox-thread-body">
                  <span className="ws-inbox-thread-top">
                    <strong>{thread.contact.name ?? formatWhatsAppPhone(thread.contact.phone)}</strong>
                    <span>{formatTime(thread.lastMessageAt)}</span>
                  </span>
                  <span className="ws-inbox-thread-preview">
                    {thread.preview ?? "No messages yet"}
                  </span>
                  <span className="ws-inbox-thread-meta">
                    <span className="ws-inbox-intent">{thread.contact.intent ?? "General"}</span>
                    {thread.contact.unreadCount > 0 ? (
                      <span className="ws-inbox-unread" aria-label="Unread" />
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {active ? (
        <>
          <section className="ws-inbox-chat" aria-label="Chat thread">
            <header className="ws-inbox-chat-head">
              <div>
                <strong>{displayName}</strong>
                <span>{formatWhatsAppPhone(active.contact.phone)}</span>
              </div>
              <div className="ws-inbox-chat-actions">
                <span className="ws-inbox-status-pill live">
                  <MessageCircle size={12} aria-hidden />
                  Official WhatsApp
                </span>
              </div>
            </header>

            {!webhookReceived ? (
              <p className="ws-inbox-alert is-warning">
                Waiting for first inbound webhook. Point Meta/RedLava to your callback URL in{" "}
                <Link href="/ai/app/settings#official-api">Settings</Link>, then send a test
                message.
              </p>
            ) : null}

            {!sessionActive ? (
              <p className="ws-inbox-alert is-warning">
                The 24-hour reply window may be closed. Free-text replies work only after the
                customer messages you again, or use an approved template from{" "}
                <Link href="/ai/app/templates">Templates</Link>.
              </p>
            ) : null}

            <div className="ws-inbox-messages">
              {messages.map((message) => {
                const bubbleClass =
                  message.direction === "INBOUND"
                    ? "inbound"
                    : message.aiGenerated
                      ? "ai"
                      : "outbound";

                return (
                  <article className={`ws-inbox-bubble ${bubbleClass}`} key={message.id}>
                    {message.aiGenerated ? (
                      <span className="ws-inbox-ai-tag">
                        <SheetomaticAiMark variant="icon" size={14} />
                        AI reply
                        {message.aiConfidence
                          ? ` - ${Math.round(message.aiConfidence * 100)}% confidence`
                          : ""}
                      </span>
                    ) : message.direction === "OUTBOUND" && message.senderName ? (
                      <span className="ws-inbox-ai-tag">{message.senderName}</span>
                    ) : null}
                    <p>{message.body}</p>
                    {message.aiGenerated && message.aiSourceTitles.length > 0 ? (
                      <p className="ws-inbox-source-citations">
                        Sources: {message.aiSourceTitles.join(", ")}
                      </p>
                    ) : null}
                    <footer>
                      <time>{formatTime(message.createdAt)}</time>
                    </footer>
                  </article>
                );
              })}
            </div>

            <footer className="ws-inbox-compose">
              <div className="ws-inbox-compose-tools">
                <label className="ws-inbox-toggle">
                  <input
                    checked={pauseAi}
                    type="checkbox"
                    disabled={pending}
                    onChange={(event) => togglePauseAi(event.target.checked)}
                  />
                  <span>Pause AI for this chat</span>
                </label>
              </div>
              {feedback ? (
                <p
                  className={`ws-inbox-feedback${feedback.includes("sent") ? " is-ok" : ""}`}
                >
                  {feedback}
                </p>
              ) : null}
              <div className="ws-inbox-compose-row">
                <textarea
                  placeholder="Type your reply — sent on Official WhatsApp (Enter to send)"
                  rows={2}
                  value={draft}
                  disabled={pending}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposeKeyDown}
                />
                <button
                  className="ws-inbox-send"
                  disabled={!draft.trim() || pending}
                  type="button"
                  onClick={sendReply}
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
                  {initials}
                </span>
                <div>
                  <strong>{displayName}</strong>
                  <span>{formatWhatsAppPhone(active.contact.phone)}</span>
                </div>
              </div>
              <dl className="ws-inbox-detail-list">
                <div>
                  <dt>Name</dt>
                  <dd>{active.contact.name ?? "Not captured yet"}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{formatWhatsAppPhone(active.contact.phone)}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{active.contact.email ?? "Not captured yet"}</dd>
                </div>
                <div>
                  <dt>City</dt>
                  <dd>{active.contact.city ?? "Not captured yet"}</dd>
                </div>
                <div>
                  <dt>Requirement</dt>
                  <dd>{active.contact.requirementDescription ?? "Not captured yet"}</dd>
                </div>
                <div>
                  <dt>Lead profile</dt>
                  <dd>
                    {active.contact.leadCaptureComplete ? "Complete" : "In progress"}
                  </dd>
                </div>
                <div>
                  <dt>Intent</dt>
                  <dd>{active.contact.intent ?? "General"}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{active.contact.source}</dd>
                </div>
                <div>
                  <dt>Assigned to</dt>
                  <dd>{active.contact.assignedToName ?? "Unassigned"}</dd>
                </div>
                <div>
                  <dt>AI status</dt>
                  <dd>{active.contact.aiEnabled ? "AI replying" : "Manual replies only"}</dd>
                </div>
              </dl>
            </div>

            <div className="ws-inbox-context-card">
              <div className="ws-inbox-card-head">
                <Tag size={16} aria-hidden />
                <strong>Tags</strong>
              </div>
              <div className="ws-inbox-tag-list">
                {active.contact.tags.map((tag) => (
                  <span className="ws-inbox-tag" key={tag}>
                    {tag}
                  </span>
                ))}
                {active.contact.tags.length === 0 ? (
                  <span className="ws-inbox-note">No tags yet</span>
                ) : null}
              </div>
            </div>

            <div className="ws-inbox-context-card">
              <div className="ws-inbox-card-head">
                <User size={16} aria-hidden />
                <strong>Notes</strong>
              </div>
              <p className="ws-inbox-note">
                {active.contact.notes ?? "No notes yet."}
              </p>
              <Link className="ws-inbox-text-btn" href={`/ai/app/contacts?id=${active.contact.id}`}>
                Open in CRM
              </Link>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
