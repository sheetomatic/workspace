import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/saas/page-header";

type ModuleCard = {
  title: string;
  text: string;
};

export function ProductModulePage({
  title,
  description,
  icon: Icon,
  cards,
  ctaHref = "/ai/app/inbox",
  ctaLabel = "Open inbox",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  cards: ModuleCard[];
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="saas-page ws-product-module-page">
      <PageHeader title={title} description={description} />
      <div className="ws-product-module-hero">
        <span className="ws-product-module-icon" aria-hidden>
          <Icon size={22} strokeWidth={2} />
        </span>
        <p>
          This module is wired into your Sheetomatic workspace. Connect WhatsApp
          in Settings, then manage conversations from the inbox.
        </p>
        <Link className="ws-product-module-cta" href={ctaHref}>
          {ctaLabel}
        </Link>
      </div>
      <div className="ws-product-module-grid">
        {cards.map((card) => (
          <article className="ws-product-module-card" key={card.title}>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
