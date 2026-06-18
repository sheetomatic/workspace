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
import { ClientProjectsShowcase } from "./client-projects-showcase";

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
    <main className="marketing-page marketing-site">
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
