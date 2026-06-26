import Link from "next/link";
import { FinalCta, SiteFooter, SiteHeader } from "@/app/components";
import { homePage, homeQuickLinks } from "@/app/page-content";
import {
  ArrowRightIcon,
  BookOpenIcon,
  BriefcaseIcon,
  LayoutDashboardIcon,
  MessageCircleIcon,
  PackageIcon,
  PhoneIcon,
  UserRoundIcon,
  WrenchIcon,
} from "@/components/marketing/marketing-icons";
import {
  MarketingLinkButton,
  WhatsAppButton,
} from "./marketing-buttons";
import { whatsappDisplayNumber } from "@/app/site-content";
import { AI_START_FREE_HREF } from "@/lib/ai-auth-links";
import { ClientProjectsShowcase } from "./client-projects-showcase";
import { FocusOffersSection } from "./focus-offers-section";
import { OutcomesSection } from "./outcomes-section";
import { IndustriesSection } from "./industries-section";
import { AiTaskPreview } from "./ai-task-preview";

const linkIcons = {
  Workspace: LayoutDashboardIcon,
  "Sheetomatic AI": MessageCircleIcon,
  Services: WrenchIcon,
  Products: PackageIcon,
  Courses: BookOpenIcon,
  About: UserRoundIcon,
  Careers: BriefcaseIcon,
  Contact: PhoneIcon,
} as const;

const linkTones = {
  Workspace: "tone-sky",
  "Sheetomatic AI": "tone-green",
  Services: "tone-amber",
  Products: "tone-indigo",
  Courses: "tone-rose",
  About: "tone-indigo",
  Careers: "tone-emerald",
  Contact: "tone-violet",
} as const;

export function HomePage() {
  return (
    <main id="main" className="marketing-page marketing-site">
      <SiteHeader />

      <section className="minimal-hero">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="minimal-hero-inner">
            <p className="type-kicker text-sky-700">{homePage.eyebrow}</p>
            <h1 className="minimal-hero-title">{homePage.title}</h1>
            <p className="minimal-hero-lead">{homePage.lead}</p>
            <div className="minimal-hero-actions">
              <MarketingLinkButton href="/login" variant="primary">
                Open Workspace
              </MarketingLinkButton>
              <WhatsAppButton label={whatsappDisplayNumber} />
            </div>
          </div>

          <div className="minimal-link-grid home-links">
            {homeQuickLinks.map((item) => {
              const Icon =
                linkIcons[item.label as keyof typeof linkIcons] ?? LayoutDashboardIcon;
              const tone =
                linkTones[item.label as keyof typeof linkTones] ?? "tone-sky";
              return (
                <Link className="minimal-link-card" href={item.href} key={item.href}>
                  <span className={`marketing-icon sm ${tone}`} aria-hidden>
                    <Icon size={20} />
                  </span>
                  <span className="minimal-link-card-body">
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <FocusOffersSection />
      <OutcomesSection />

      <section aria-labelledby="home-workspace-preview" className="section soft-section">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="section-heading">
            <p>Workspace</p>
            <h2 id="home-workspace-preview">From voice note to assigned task in seconds</h2>
            <div className="section-subcopy">
              Delegate work, set reminders, and keep owners accountable — the same
              operational discipline large SaaS platforms use, built for Indian MSMEs.
            </div>
          </div>
          <div className="mt-10">
            <AiTaskPreview />
          </div>
        </div>
      </section>

      <IndustriesSection />

      <section aria-labelledby="home-ai-promo-title" className="home-ai-promo">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="home-ai-promo-inner">
            <div className="home-ai-promo-copy">
              <p className="home-ai-promo-kicker">Sheetomatic AI</p>
              <h2 className="home-ai-promo-title" id="home-ai-promo-title">
                WhatsApp AI, team inbox, and CRM in one workspace
              </h2>
              <p className="home-ai-promo-lead">
                Connect your business number, train replies from FAQs and docs, and
                hand off to your team when a human should take over.
              </p>
              <ul className="home-ai-promo-highlights">
                <li>AI replies on WhatsApp</li>
                <li>Shared team inbox</li>
                <li>Go live when you are ready</li>
              </ul>
              <div className="home-ai-promo-actions">
                <MarketingLinkButton href={AI_START_FREE_HREF} variant="primary">
                  Start free
                </MarketingLinkButton>
                <MarketingLinkButton href="/ai" variant="secondary">
                  <span>Explore Sheetomatic AI</span>
                  <ArrowRightIcon size={18} />
                </MarketingLinkButton>
              </div>
            </div>
            <Link className="home-ai-promo-card" href="/ai">
              <span className="marketing-icon sm tone-green" aria-hidden>
                <MessageCircleIcon size={20} />
              </span>
              <span className="home-ai-promo-card-body">
                <strong>Built for Indian MSMEs</strong>
                <span>
                  Official WhatsApp Business API, knowledge-trained replies, and
                  human takeover from one dashboard.
                </span>
              </span>
              <ArrowRightIcon size={18} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <ClientProjectsShowcase />

      <section className="minimal-strip soft-section">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <p className="type-body text-slate-600">
            Google Sheets, AppSheet, Looker Studio, client workspaces, and
            WhatsApp - one delivery stack for MSME operations.
          </p>
          <div className="cta-stack mx-auto mt-8 flex flex-wrap items-center justify-center gap-3">
            <MarketingLinkButton href="/login" variant="secondary">
              <span>Sign in to Workspace</span>
              <ArrowRightIcon size={18} />
            </MarketingLinkButton>
            <MarketingLinkButton href="/ai" variant="secondary">
              <span>Explore Sheetomatic AI</span>
              <ArrowRightIcon size={18} />
            </MarketingLinkButton>
            <MarketingLinkButton href="/products" variant="secondary">
              <span>Browse products</span>
              <ArrowRightIcon size={18} />
            </MarketingLinkButton>
            <MarketingLinkButton href="/courses" variant="secondary">
              <span>Free courses</span>
              <ArrowRightIcon size={18} />
            </MarketingLinkButton>
          </div>
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </main>
  );
}
