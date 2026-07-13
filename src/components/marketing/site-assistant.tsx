"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import { whatsappUrl } from "@/app/site-content";
import { isAllowedSiteAssistantHref } from "@/lib/site-assistant/links";
import { shouldShowSiteAssistant } from "@/lib/site-assistant/visibility";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import { AssistantVoiceButton } from "@/components/saas/assistant-voice-button";
import "./site-assistant.css";

type ChatLink = { label: string; href: string };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: ChatLink[];
};

const STARTER_CHIPS: { label: string; prompt: string }[] = [
  { label: "FMS", prompt: "What is FMS and where can I learn more?" },
  { label: "IMS", prompt: "What is IMS and how does inventory work?" },
  { label: "Courses", prompt: "Tell me about the owner courses and how to enroll." },
  { label: "Workspace", prompt: "How do I open Sheetomatic Workspace?" },
  { label: "Pricing / contact", prompt: "How do I get pricing or talk to someone?" },
];

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi — I'm **Pulse**, Sheetomatic AI. Ask about FMS, IMS, courses, Workspace, or how to buy. I'll point you to the right page.",
  links: [
    { label: "Services", href: "/services" },
    { label: "Courses", href: "/courses" },
    { label: "Contact", href: "/contact" },
  ],
};

function subscribeHost(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getHostSnapshot() {
  return window.location.hostname;
}

function getHostServerSnapshot() {
  return "sheetomatic.com";
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (m) {
        const href = m[2].trim();
        const label = m[1];
        if (!isAllowedSiteAssistantHref(href)) {
          parts.push(label);
        } else if (href.startsWith("https://")) {
          parts.push(
            <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
              {label}
            </a>,
          );
        } else {
          parts.push(
            <Link key={key++} href={href}>
              {label}
            </Link>,
          );
        }
      } else {
        parts.push(token);
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

export function SiteAssistant() {
  const pathname = usePathname() || "/";
  const hostname = useSyncExternalStore(
    subscribeHost,
    getHostSnapshot,
    getHostServerSnapshot,
  );
  const visible = shouldShowSiteAssistant(pathname, hostname);

  const panelId = useId();
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      setError(null);
      setInput("");
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
      };

      setMessages((prev) => {
        const next = [...prev, userMsg];
        return next;
      });
      setBusy(true);

      const historyPayload = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch("/api/site-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyPayload }),
        });
        const data = (await res.json()) as {
          reply?: string;
          links?: ChatLink[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || "Something went wrong.");
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content:
              data.reply?.trim() ||
              "I could not form an answer. Try Contact or WhatsApp.",
            links: data.links,
          },
        ]);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not reach Pulse.";
        setError(message);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-err-${Date.now()}`,
            role: "assistant",
            content:
              "I hit a snag answering that. You can try again, or reach us on [Contact](/contact) or WhatsApp.",
            links: [
              { label: "Contact", href: "/contact" },
              { label: "WhatsApp", href: whatsappUrl },
            ],
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages],
  );

  if (!visible) {
    return null;
  }

  return (
    <div className="site-assistant" data-open={open ? "true" : "false"}>
      {open ? (
        <section
          className="site-assistant-panel"
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <header className="site-assistant-header">
            <div className="site-assistant-header-copy">
              <p className="site-assistant-kicker">Sheetomatic AI</p>
              <h2 id={titleId}>Pulse</h2>
              <p className="site-assistant-sub">
                Site guide — FMS, courses, Workspace &amp; how to buy
              </p>
            </div>
            <button
              type="button"
              className="site-assistant-close"
              aria-label="Close Pulse"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <div className="site-assistant-messages" ref={listRef} tabIndex={0}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`site-assistant-bubble site-assistant-bubble-${msg.role}`}
              >
                <div className="site-assistant-bubble-text">
                  {msg.content.split("\n").map((line, i) => (
                    <p key={`${msg.id}-${i}`}>{renderInlineMarkdown(line)}</p>
                  ))}
                </div>
                {msg.links && msg.links.length > 0 ? (
                  <ul className="site-assistant-links">
                    {msg.links.map((link) => (
                      <li key={`${msg.id}-${link.href}-${link.label}`}>
                        {link.href.startsWith("http") ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link href={link.href} onClick={() => setOpen(false)}>
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
            {busy ? (
              <p className="site-assistant-typing" aria-live="polite">
                Thinking…
              </p>
            ) : null}
          </div>

          <div className="site-assistant-chips" aria-label="Suggested topics">
            {STARTER_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                className="site-assistant-chip"
                disabled={busy}
                onClick={() => void send(chip.prompt)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <form
            className="site-assistant-form"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <label className="sr-only" htmlFor={`${panelId}-input`}>
              Ask Pulse
            </label>
            <textarea
              id={`${panelId}-input`}
              ref={inputRef}
              rows={2}
              value={input}
              disabled={busy}
              placeholder="Ask Pulse about FMS, courses, Workspace…"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
            />
            <div className="site-assistant-form-actions">
              <AssistantVoiceButton
                disabled={busy}
                onTranscript={(text) =>
                  setInput((prev) => (prev ? `${prev} ${text}` : text).trim())
                }
              />
              <a className="site-assistant-quick" href={WORKSPACE_LOGIN_HREF}>
                Workspace
              </a>
              <a
                className="site-assistant-quick"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
              <button type="submit" disabled={busy || !input.trim()}>
                Send
              </button>
            </div>
            {error ? (
              <p className="site-assistant-error" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="site-assistant-fab"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Close Pulse" : "Ask Pulse"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="site-assistant-fab-icon" aria-hidden>
          {open ? (
            "×"
          ) : (
            <SheetomaticAiMark variant="icon" sizes="sm" onDark />
          )}
        </span>
        <span className="site-assistant-fab-label">Ask Pulse</span>
      </button>
    </div>
  );
}
