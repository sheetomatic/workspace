import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  Settings,
  FileText,
  AlertCircle,
} from "lucide-react";
import type { getCampaignRelatedSetup } from "@/lib/ai-module-data";

type SetupData = Awaited<ReturnType<typeof getCampaignRelatedSetup>>;

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`ai-setup-pill${ok ? " is-ok" : " is-warn"}`}>
      {ok ? <CheckCircle2 size={12} aria-hidden /> : <AlertCircle size={12} aria-hidden />}
      {label}
    </span>
  );
}

export function CampaignRelatedSetup({ data }: { data: SetupData }) {
  const sourceLabel =
    data.credentials.source === "mixed"
      ? "Workspace + platform"
      : data.credentials.source === "environment"
        ? "Platform env"
        : "Workspace settings";

  const cards = [
    {
      href: "/ai/app/settings",
      icon: Settings,
      title: "Settings",
      subtitle: "RedLava API key, Phone ID, team numbers",
      status: data.settingsReady ? "Ready" : "Incomplete",
      ok: data.settingsReady,
      details: [
        { ok: data.apiKeyReady, text: "RedLava API key saved" },
        { ok: data.phoneIdReady, text: "Phone ID configured" },
        {
          ok: data.managerCount > 0,
          text: `${data.managerCount} manager WhatsApp number${data.managerCount === 1 ? "" : "s"} on file`,
        },
      ],
      cta: "Open Settings",
    },
    {
      href: "/ai/app/templates",
      icon: FileText,
      title: "Templates",
      subtitle: "Submit and sync approved WhatsApp templates",
      status:
        data.approvedTemplates > 0
          ? `${data.approvedTemplates} approved`
          : data.pendingTemplates > 0
            ? `${data.pendingTemplates} pending`
            : "Not synced",
      ok: data.approvedTemplates > 0,
      details: [
        {
          ok: data.approvedTemplates > 0,
          text: `${data.approvedTemplates} approved template${data.approvedTemplates === 1 ? "" : "s"}`,
        },
        {
          ok: data.pendingTemplates === 0,
          text:
            data.pendingTemplates > 0
              ? `${data.pendingTemplates} awaiting approval`
              : "No pending submissions",
        },
      ],
      cta: "Manage templates",
    },
    {
      href: "/ai/app/inbox",
      icon: MessageCircle,
      title: "Chats",
      subtitle: "Live team inbox after Go Live",
      status: data.goLive.isLive ? "Live" : data.goLive.webhookReceived ? "Receiving" : "Waiting",
      ok: data.goLive.isLive,
      details: [
        {
          ok: data.goLive.isLive,
          text: data.goLive.isLive ? "AI bot is live" : "Go Live from checklist above",
        },
        {
          ok: data.stats.openConversations >= 0,
          text: `${data.stats.openConversations} open conversation${data.stats.openConversations === 1 ? "" : "s"}`,
        },
        {
          ok: data.stats.unreadMessages === 0,
          text:
            data.stats.unreadMessages > 0
              ? `${data.stats.unreadMessages} unread messages`
              : "Inbox clear",
        },
      ],
      cta: "Open Chats",
      wa: true,
    },
  ] as const;

  return (
    <section className="ai-campaign-setup">
      <header className="ai-campaign-setup-head">
        <div>
          <h2>Related setup</h2>
          <p>Connection, templates, and inbox - everything needed before and after Go Live.</p>
        </div>
        <div className="ai-campaign-provider">
          <span className="ai-campaign-provider-label">Provider</span>
          <strong>RedLava</strong>
          <StatusPill
            ok={data.canSend}
            label={data.canSend ? "Connected" : "Not configured"}
          />
        </div>
      </header>

      <div className="ai-campaign-setup-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link className="ai-campaign-setup-card" href={card.href} key={card.title}>
              <div className="ai-campaign-setup-card-top">
                <span
                  className={`ai-campaign-setup-icon${"wa" in card && card.wa ? " tone-wa" : ""}`}
                  aria-hidden
                >
                  <Icon size={18} strokeWidth={2} />
                </span>
                <StatusPill ok={card.ok} label={card.status} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.subtitle}</p>
              <ul className="ai-campaign-setup-checks">
                {card.details.map((item) => (
                  <li key={item.text} className={item.ok ? "is-ok" : "is-warn"}>
                    {item.ok ? (
                      <CheckCircle2 size={13} aria-hidden />
                    ) : (
                      <AlertCircle size={13} aria-hidden />
                    )}
                    {item.text}
                  </li>
                ))}
              </ul>
              <span className="ai-campaign-setup-cta">
                {card.cta}
                <ChevronRight size={14} aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>

      <footer className="ai-campaign-setup-foot">
        <span>
          Credential source: <strong>{sourceLabel}</strong>
        </span>
        {data.goLive.businessPhone ? (
          <span>
            Business number: <strong>{data.goLive.businessPhone}</strong>
          </span>
        ) : null}
        {data.goLive.phoneId ? (
          <span>
            Phone ID: <strong>{data.goLive.phoneId}</strong>
          </span>
        ) : null}
      </footer>
    </section>
  );
}
