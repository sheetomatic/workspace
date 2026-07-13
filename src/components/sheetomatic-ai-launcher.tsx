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
import { isAllowedWorkspaceAssistantHref } from "@/lib/workspace-assistant/links";
import { shouldShowWorkspaceAssistant } from "@/lib/workspace-assistant/visibility";
import {
  openWorkspaceGuide,
  WORKSPACE_GUIDE_ASSISTANT_EVENT,
  type WorkspaceGuideAssistantDetail,
} from "@/lib/workspace-guides/events";
import type { WorkspaceGuideModuleId } from "@/lib/workspace-guides";
import { WorkspaceGuideHost } from "@/components/saas/workspace-guide-host";
import "./sheetomatic-ai-launcher.css";

type ChatLink = { label: string; href: string };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: ChatLink[];
  guideId?: WorkspaceGuideModuleId | null;
  stepId?: string | null;
};

const STARTER_CHIPS: { label: string; prompt: string }[] = [
  { label: "FMS steps", prompt: "How do I complete my FMS steps in My stops?" },
  { label: "IMS stock", prompt: "Where do I check IMS stock and reorder exceptions?" },
  { label: "Tasks / EA", prompt: "How do I create a task and see my EA work for today?" },
  { label: "EM Ready", prompt: "How do I open EM Ready for the weekly review?" },
  { label: "Checklists", prompt: "How do I run my checklists or PC today?" },
];

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi — I'm **Workspace help** (Ask guide). Ask how to use FMS, IMS, Tasks, Checklists, HR, or EM Ready. I'll point you to the right screen — not WhatsApp AI sales.",
  links: [
    { label: "My FMS stops", href: "/app/fms/my-stops" },
    { label: "IMS stock", href: "/app/ims/stock" },
    { label: "EM Ready", href: "/app/em" },
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
  return "workspace.sheetomatic.com";
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
        if (!isAllowedWorkspaceAssistantHref(href)) {
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

/**
 * Floating Workspace guide on workspace hosts and /app/*.
 * Opens a chat panel (not a dead link to /ai). Separate from marketing Ask Sheetomatic.
 */
export function SheetomaticAiLauncher() {
  const pathname = usePathname() || "/";
  const hostname = useSyncExternalStore(
    subscribeHost,
    getHostSnapshot,
    getHostServerSnapshot,
  );
  const visible = shouldShowWorkspaceAssistant(pathname, hostname);

  const panelId = useId();
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(raw: string) => Promise<void>>(async () => undefined);
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

  useEffect(() => {
    function onAssistantEvent(event: Event) {
      const detail = (event as CustomEvent<WorkspaceGuideAssistantDetail>)
        .detail;
      if (detail?.open === false) {
        setOpen(false);
        return;
      }
      setOpen(true);
      if (detail?.seedPrompt?.trim()) {
        void sendRef.current(detail.seedPrompt.trim());
      }
    }
    window.addEventListener(WORKSPACE_GUIDE_ASSISTANT_EVENT, onAssistantEvent);
    return () =>
      window.removeEventListener(
        WORKSPACE_GUIDE_ASSISTANT_EVENT,
        onAssistantEvent,
      );
  }, []);

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

      setMessages((prev) => [...prev, userMsg]);
      setBusy(true);

      const historyPayload = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch("/api/workspace-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyPayload }),
        });
        const data = (await res.json()) as {
          reply?: string;
          links?: ChatLink[];
          guideId?: WorkspaceGuideModuleId | null;
          stepId?: string | null;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || "Something went wrong.");
        }
        const guideId = data.guideId ?? null;
        const stepId = data.stepId ?? null;
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content:
              data.reply?.trim() ||
              "I could not form an answer. Try again, or ask an Admin.",
            links: data.links,
            guideId,
            stepId,
          },
        ]);
        if (guideId) {
          openWorkspaceGuide(guideId, stepId);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not reach Workspace help.";
        setError(message);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-err-${Date.now()}`,
            role: "assistant",
            content:
              "I hit a snag answering that. Try again, or open [Settings](/app/settings) and ask an Admin.",
            links: [{ label: "Settings", href: "/app/settings" }],
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages],
  );

  sendRef.current = send;

  if (!visible) {
    return null;
  }

  return (
    <>
      <WorkspaceGuideHost />
      <div className="ws-guide" data-open={open ? "true" : "false"}>
      {open ? (
        <section
          className="ws-guide-panel"
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <header className="ws-guide-header">
            <div className="ws-guide-header-copy">
              <p className="ws-guide-kicker">Workspace guide</p>
              <h2 id={titleId}>Ask guide</h2>
              <p className="ws-guide-sub">
                How to use FMS, IMS, Tasks, HR &amp; EM — not WhatsApp AI
              </p>
            </div>
            <button
              type="button"
              className="ws-guide-close"
              aria-label="Close Ask guide"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <div className="ws-guide-messages" ref={listRef} tabIndex={0}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`ws-guide-bubble ws-guide-bubble-${msg.role}`}
              >
                <div className="ws-guide-bubble-text">
                  {msg.content.split("\n").map((line, i) => (
                    <p key={`${msg.id}-${i}`}>{renderInlineMarkdown(line)}</p>
                  ))}
                </div>
                {msg.links && msg.links.length > 0 ? (
                  <ul className="ws-guide-links">
                    {msg.links.map((link) => (
                      <li key={`${msg.id}-${link.href}-${link.label}`}>
                        <Link href={link.href} onClick={() => setOpen(false)}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {msg.role === "assistant" && msg.guideId ? (
                  <button
                    type="button"
                    className="ws-guide-show-snapshot"
                    onClick={() => openWorkspaceGuide(msg.guideId!, msg.stepId)}
                  >
                    Show snapshot guide
                  </button>
                ) : null}
              </div>
            ))}
            {busy ? (
              <p className="ws-guide-typing" aria-live="polite">
                Thinking…
              </p>
            ) : null}
          </div>

          <div className="ws-guide-chips" aria-label="Suggested topics">
            {STARTER_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                className="ws-guide-chip"
                disabled={busy}
                onClick={() => void send(chip.prompt)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <form
            className="ws-guide-form"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <label className="sr-only" htmlFor={`${panelId}-input`}>
              Ask how to use Workspace
            </label>
            <textarea
              id={`${panelId}-input`}
              ref={inputRef}
              rows={2}
              value={input}
              disabled={busy}
              placeholder="Ask how to use FMS, IMS, EM…"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
            />
            <div className="ws-guide-form-actions">
              <Link
                className="ws-guide-quick"
                href="/app/fms/my-stops"
                onClick={() => setOpen(false)}
              >
                My stops
              </Link>
              <Link
                className="ws-guide-quick"
                href="/app/em"
                onClick={() => setOpen(false)}
              >
                EM Ready
              </Link>
              <button type="submit" disabled={busy || !input.trim()}>
                Send
              </button>
            </div>
            {error ? (
              <p className="ws-guide-error" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="ws-guide-fab"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Close Ask guide" : "Open Ask guide"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ws-guide-fab-icon" aria-hidden>
          {open ? "×" : "?"}
        </span>
        <span className="ws-guide-fab-label">Ask guide</span>
      </button>
    </div>
    </>
  );
}
