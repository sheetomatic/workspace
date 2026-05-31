import "@/components/marketing/minimal-premium.css";
import Image from "next/image";
import Link from "next/link";
import {
  WhatsAppButton,
} from "@/components/marketing/marketing-buttons";
import { SocialLinks } from "@/components/marketing/social-links";
import { contactDetails, footerCompanyLinks, mainNav } from "./page-content";
import {
  finalCtaContent,
  siteBrand,
  whatsappDisplayNumber,
} from "./site-content";
import { footerIndustryLinks, footerProductLinks } from "./product-content";
import { AI_LOGIN_HREF, AI_START_FREE_HREF } from "@/lib/ai-auth-links";

export function SiteBrand({
  variant = "header",
}: {
  variant?: "header" | "footer";
}) {
  return (
    <Link
      className={`site-brand ${variant === "footer" ? "site-brand-footer" : ""}`}
      href="/"
    >
      <span className="logo-mark">
        <Image
          src={siteBrand.logoSrc}
          alt={siteBrand.logoAlt}
          width={40}
          height={40}
          priority={variant === "header"}
        />
      </span>
      <span className="site-brand-text">
        <strong>{siteBrand.name}</strong>
        <small>
          {variant === "footer" ? siteBrand.tagline : siteBrand.headerTagline}
        </small>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header-saas">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="site-header-bar flex items-center justify-between gap-3 py-3.5">
          <SiteBrand variant="header" />
          <nav
            className="site-nav-saas site-nav-desktop hidden min-[901px]:flex items-center gap-6"
            aria-label="Main"
          >
            {mainNav.map((item) => (
              <Link
                className="shrink-0 whitespace-nowrap text-inherit no-underline hover:text-blue-600"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="site-header-actions">
            <Link className="ab-header-workspace" href={AI_LOGIN_HREF}>
              Log in
            </Link>
            <Link className="ab-header-workspace" href={AI_START_FREE_HREF}>
              Start Free
            </Link>
            <Link className="ab-header-workspace" href="/login">
              Workspace
            </Link>
            <WhatsAppButton className="header-cta" label={whatsappDisplayNumber} />
          </div>
        </div>
        <nav
          className="site-nav-mobile hidden max-[900px]:flex items-center gap-2 overflow-x-auto pb-3"
          aria-label="Main mobile"
        >
          {mainNav.map((item) => (
            <Link
              className="shrink-0 whitespace-nowrap no-underline"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer-saas">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="site-footer-grid site-footer-minimal">
          <div className="site-footer-brand">
            <SiteBrand variant="footer" />
            <p>{siteBrand.footerDescription}</p>
            <SocialLinks variant="footer" />
            <WhatsAppButton className="btn-footer-cta" label={whatsappDisplayNumber} />
          </div>
          <div>
            <h4>Product</h4>
            {footerProductLinks.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/login">Workspace</Link>
            <Link href={AI_LOGIN_HREF}>Log in to AI</Link>
            <Link href={AI_START_FREE_HREF}>Start free</Link>
          </div>
          <div>
            <h4>Industries</h4>
            {footerIndustryLinks.map((item) => (
              <Link href={item.href} key={item.label}>
                {item.label}
              </Link>
            ))}
          </div>
          <div>
            <h4>Company</h4>
            {footerCompanyLinks.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/login">Sign in</Link>
          </div>
          <div className="site-footer-reach">
            <h4>Reach us</h4>
            <div className="footer-reach-stack">
              <WhatsAppButton
                className="footer-inline-btn footer-whatsapp-btn"
                label={contactDetails.whatsappNumber}
              />
              <a
                className="footer-website-link"
                href={contactDetails.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {contactDetails.website}
              </a>
            </div>
          </div>
        </div>
        <div className="site-footer-bottom">
          <span>{siteBrand.footerBottomLine}</span>
          <span>{siteBrand.tagline}</span>
        </div>
      </div>
    </footer>
  );
}

export function PageHero({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="page-hero saas-page-hero">
      <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8">
        <div className="eyebrow mx-auto">{eyebrow}</div>
        <h1 className="type-page-title mt-6">{title}</h1>
        <p className="type-lead mx-auto mt-5 max-w-3xl">{text}</p>
      </div>
    </section>
  );
}

export function FinalCta({
  variant = "default",
}: {
  variant?: "default" | "whatsapp";
}) {
  const content = finalCtaContent;

  if (variant === "whatsapp") {
    return (
      <section className="wa-final-cta" id="consult">
        <div className="wa-final-cta-inner mx-auto max-w-5xl px-5 text-center sm:px-8">
          <p className="wa-kicker">{content.kicker}</p>
          <h2 className="type-section-title mt-4 text-slate-950">
            Connect WhatsApp to your MIS and follow-up flow
          </h2>
          <p className="type-lead mx-auto mt-4 max-w-2xl">
            Plan official API setup, templates, inbox, and integrations with
            Sheetomatic on Google Workspace.
          </p>
          <div className="wa-final-cta-actions cta-stack">
            <WhatsAppButton
              className="wa-final-btn"
              label={whatsappDisplayNumber}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="saas-final-cta" id="consult">
      <div className="saas-final-cta-inner mx-auto max-w-5xl px-5 text-center sm:px-8">
        <p className="saas-final-kicker">{content.kicker}</p>
        <h2>{content.title}</h2>
        <p className="saas-final-cta-copy">{content.text}</p>
        <div className="saas-final-cta-actions cta-stack">
          <WhatsAppButton
            className="saas-final-cta-btn"
            label={whatsappDisplayNumber}
          />
        </div>
      </div>
    </section>
  );
}

export function MarketingPage({ children }: { children: React.ReactNode }) {
  return (
    <main className="marketing-page marketing-site">{children}</main>
  );
}

