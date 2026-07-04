import "@/components/marketing/minimal-premium.css";
import Link from "next/link";
import {
  ContactButtons,
} from "@/components/marketing/marketing-buttons";
import { marketingButtonClass } from "@/components/marketing/marketing-button-class";
import { PhoneIcon } from "@/components/marketing/marketing-icons";
import { SocialLinks } from "@/components/marketing/social-links";
import {
  contactDetails,
  footerCompanyLinks,
  footerProductLinks,
} from "./page-content";
import { SiteHeaderNav } from "@/components/marketing/site-header-nav";
import { BrandIconMark } from "@/components/brand/brand-icon-mark";
import {
  finalCtaContent,
  siteBrand,
  whatsappTel,
  whatsappDisplayNumber,
} from "./site-content";

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
        <BrandIconMark
          size={26}
          priority={variant === "header"}
          theme={variant === "footer" ? "light" : "dark"}
        />
      </span>
      <span className="site-brand-text">
        <strong>{siteBrand.name}</strong>
        <small>
          <span className="site-brand-kicker">
            {variant === "footer" ? siteBrand.tagline : siteBrand.headerTagline}
          </span>
          <span className="site-brand-micro">{siteBrand.descriptor}</span>
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
          <SiteHeaderNav variant="desktop" />
          <div className="site-header-actions">
            <a
              aria-label={`Call ${whatsappDisplayNumber}`}
              className={marketingButtonClass("secondary", "header-cta ab-header-call")}
              href={`tel:${whatsappTel}`}
            >
              <span className="btn-cta-icon-wrap" aria-hidden>
                <PhoneIcon className="btn-cta-icon" size={18} strokeWidth={2.25} />
              </span>
              <span className="ab-header-call-full">Call {whatsappDisplayNumber}</span>
              <span className="ab-header-call-short">Call</span>
            </a>
            <Link className="ab-header-ai" href="/ai">
              Sheetomatic AI
            </Link>
            <Link className="ab-header-workspace" href="/login">
              Workspace
            </Link>
          </div>
        </div>
        <SiteHeaderNav variant="mobile" />
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
            <ContactButtons
              className="footer-reach-stack"
              whatsappClassName="btn-footer-cta"
              whatsappLabel={whatsappDisplayNumber}
              callClassName="btn-footer-cta"
            />
          </div>
          <div className="site-footer-links">
            <p className="site-footer-col-label">Product</p>
            <nav aria-label="Product links">
              {footerProductLinks.map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="site-footer-links">
            <p className="site-footer-col-label">Company</p>
            <nav aria-label="Company links">
              {footerCompanyLinks.map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="site-footer-reach">
            <p className="site-footer-col-label">Reach us</p>
            <div className="footer-reach-stack">
              <ContactButtons
                className="footer-reach-stack"
                whatsappClassName="footer-inline-btn footer-whatsapp-btn"
                whatsappLabel={contactDetails.whatsappNumber}
                callClassName="footer-inline-btn"
                callLabel="Call now"
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
        <p className="type-lead mx-auto mt-5 max-w-2xl text-center">{text}</p>
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
            Turn WhatsApp into your MSME growth channel
          </h2>
          <p className="type-lead mx-auto mt-4 max-w-2xl">
            Official API, AI follow-ups, and deep ties to FMS, IMS, and your
            operating systems — so sales and ops scale without you.
          </p>
          <ContactButtons
            className="wa-final-cta-actions cta-stack"
            whatsappClassName="wa-final-btn"
            whatsappLabel={whatsappDisplayNumber}
            callClassName="wa-final-btn"
          />
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
        <ContactButtons
          className="saas-final-cta-actions cta-stack"
          whatsappClassName="saas-final-cta-btn"
          whatsappLabel={whatsappDisplayNumber}
          callClassName="saas-final-cta-btn"
        />
      </div>
    </section>
  );
}

export function MarketingPage({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="marketing-page marketing-site">
      {children}
    </main>
  );
}

