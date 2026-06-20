import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Globe,
  Headphones,
  MessageCircle,
  Plug,
  Settings,
} from "lucide-react";

type IntegrationCard = {
  id: string;
  title: string;
  description: string;
  icon: typeof Globe;
  href: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  connected?: boolean;
};

export function AiConnectIntegrationsPanel({
  whatsAppConnected,
  isLive,
}: {
  whatsAppConnected: boolean;
  isLive: boolean;
}) {
  const cards: IntegrationCard[] = [
    {
      id: "website",
      title: "Connect to Website",
      description: "Add chatbot to your website and go live",
      icon: Globe,
      href: "/contact",
      primaryLabel: "Connect",
      secondaryHref: "/ai/app/campaign",
      secondaryLabel: "Enable bot",
    },
    {
      id: "whatsapp",
      title: "Connect WhatsApp",
      description: "Set up WhatsApp chatbot with Sheetomatic WhatsApp credentials",
      icon: MessageCircle,
      href: "/ai/app/settings",
      primaryLabel: whatsAppConnected ? "Manage" : "Connect",
      connected: whatsAppConnected,
    },
    {
      id: "whatsapp-api",
      title: "Connect WhatsApp API",
      description: "Connect API to manage chats at scale",
      icon: Settings,
      href: "/ai/app/settings",
      primaryLabel: whatsAppConnected ? "Manage API" : "Connect",
      connected: whatsAppConnected,
    },
    {
      id: "mis",
      title: "Connect MIS Workspace",
      description:
        "Link Google Sheets for dashboard data and export WhatsApp CRM leads to a WA CRM tab",
      icon: Building2,
      href: "/app/settings",
      primaryLabel: "Connect",
      secondaryHref: "/ai/app/contacts",
      secondaryLabel: "Sync CRM",
    },
  ];

  return (
    <div className="ai-joyz-connect-page">
      <div className="ai-joyz-connect-hero">
        <span className="ai-joyz-connect-icon" aria-hidden>
          <Plug size={28} strokeWidth={1.75} />
        </span>
        <h1>Connect integrations</h1>
        <p>Connect your tools to power your WhatsApp CRM and automate workflows.</p>
      </div>

      <div className="ai-joyz-connect-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="ai-joyz-connect-card" key={card.id}>
              <span className="ai-joyz-connect-card-icon" aria-hidden>
                <Icon size={20} />
              </span>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
              {card.connected ? (
                <span className="ai-joyz-status-pill is-live">Connected</span>
              ) : null}
              <div className="ai-joyz-connect-card-actions">
                <Link className="ai-joyz-outline-btn" href={card.href}>
                  {card.primaryLabel}
                </Link>
                {card.secondaryHref && card.secondaryLabel ? (
                  <Link className="ai-joyz-outline-btn" href={card.secondaryHref}>
                    {card.secondaryLabel}
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="ai-joyz-help-banner">
        <Headphones size={20} aria-hidden />
        <p>
          Need help setting up integrations? Our team will guide you step-by-step to get
          everything connected.
        </p>
        <Link className="ai-joyz-outline-btn" href="/contact">
          Get help
        </Link>
      </div>

      <div className="ai-joyz-connect-footer">
        <Link className="ai-joyz-later-link" href="/ai/app">
          I will do it later
        </Link>
        <Link className="ai-joyz-primary-btn" href="/ai/app">
          Go to dashboard
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>

      {isLive ? (
        <p className="ai-joyz-connect-status" role="status">
          WhatsApp AI is live on your business number.
        </p>
      ) : null}
    </div>
  );
}
