import { FinalCta, MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { clientProblems, productCategories, productsPage } from "@/app/page-content";
import "./minimal-premium.css";
import {
  Bot,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  GitBranch,
  MapPin,
  MessageCircle,
  Package,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { WhatsAppButton } from "./marketing-buttons";
import { whatsappDisplayNumber } from "@/app/site-content";

const productIcons: { icon: LucideIcon; tone: string }[] = [
  { icon: Users, tone: "tone-sky" },
  { icon: CalendarCheck, tone: "tone-emerald" },
  { icon: MapPin, tone: "tone-violet" },
  { icon: Package, tone: "tone-indigo" },
  { icon: MessageCircle, tone: "tone-green" },
  { icon: Bot, tone: "tone-green" },
  { icon: Sparkles, tone: "tone-green" },
  { icon: GitBranch, tone: "tone-amber" },
  { icon: ClipboardCheck, tone: "tone-rose" },
  { icon: Building2, tone: "tone-slate" },
];

export function ProductsPageContent() {
  return (
    <MarketingPage>
      <SiteHeader />
      <section className="minimal-hero">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8">
          <p className="type-kicker text-sky-700">{productsPage.eyebrow}</p>
          <h1 className="minimal-hero-title mt-4">{productsPage.title}</h1>
          <p className="minimal-hero-lead mx-auto max-w-2xl">{productsPage.lead}</p>
        </div>
      </section>

      <section className="minimal-strip bg-white pb-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="product-minimal-grid">
            {productCategories.map((product, index) => {
              const meta = productIcons[index] ?? productIcons[0];
              const Icon = meta.icon;
              return (
                <article
                  className={`product-minimal-card ${product.featured ? "featured" : ""}`}
                  key={product.name}
                >
                  <span className={`marketing-icon ${meta.tone}`} aria-hidden>
                    <Icon size={22} />
                  </span>
                  <div className="product-minimal-card-body">
                    <h3>{product.name}</h3>
                    <p>{product.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="resolution-blue-strip" aria-label="How Sheetomatic works">
        <div className="mx-auto max-w-5xl px-5 text-center sm:px-8">
          <p>{clientProblems.resolution}</p>
        </div>
      </section>

      <section className="minimal-strip bg-white pb-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <p className="type-body-sm mx-auto max-w-xl text-center text-slate-500">
            Scope and delivery timeline are confirmed on WhatsApp.
          </p>
          <div className="contact-actions centered cta-stack mx-auto mt-6">
            <WhatsAppButton className="btn-block" label={whatsappDisplayNumber} />
          </div>
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
