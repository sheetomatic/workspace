import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/saas/page-header";

export type AiModuleHubCard = {
  title: string;
  text: string;
  href: string;
  linkLabel?: string;
  badge?: string;
};

export function AiModuleHub({
  title,
  description,
  icon: Icon,
  cards,
  primaryHref = "/ai/app/settings",
  primaryLabel = "Open Settings",
  secondaryHref = "/ai/app/inbox",
  secondaryLabel = "Open Chats",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  cards: AiModuleHubCard[];
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="saas-page ws-product-module-page">
      <PageHeader title={title} description={description} />

      <div className="ws-product-module-hero ws-training-hero">
        <span className="ws-product-module-icon" aria-hidden>
          <Icon size={22} strokeWidth={2} />
        </span>
        <p>
          Connect WhatsApp in Settings, train your AI, then manage live conversations
          from Chats. Each card below opens the working area for that feature.
        </p>
        <div className="ws-training-hero-actions">
          <Link className="ws-product-module-cta" href={primaryHref}>
            {primaryLabel}
          </Link>
          <Link className="btn-cta btn-secondary" href={secondaryHref}>
            {secondaryLabel}
          </Link>
        </div>
      </div>

      <div className="ws-product-module-grid ws-training-feature-grid">
        {cards.map((card) => (
          <Link
            className="ws-product-module-card ws-training-feature-card"
            href={card.href}
            key={card.title}
          >
            {card.badge ? (
              <span className="ws-wa-template-badge">{card.badge}</span>
            ) : null}
            <h2>{card.title}</h2>
            <p>{card.text}</p>
            <span className="ws-training-feature-link">
              {card.linkLabel ?? "Open"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
