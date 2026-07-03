import Link from "next/link";
import { siteBrand, whatsappDisplayNumber } from "@/app/site-content";
import { BrandIconMark } from "@/components/brand/brand-icon-mark";
import { ContactButtons } from "@/components/marketing/marketing-buttons";
import { AI_LOGIN_HREF, AI_START_FREE_HREF } from "@/lib/ai-auth-links";

const aiNav = [
  { href: "/ai", label: "Home" },
  { href: "/ai/chatbot", label: "AI Chatbot" },
  { href: "/ai/crm", label: "CRM & Inbox" },
  { href: "/ai/pricing", label: "Pricing" },
];

export function AiSiteHeader() {
  return (
    <header className="site-header-saas ai-site-header">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="site-header-bar flex items-center justify-between gap-3 py-3.5">
          <Link className="site-brand" href="/ai">
            <span className="logo-mark">
              <BrandIconMark size={26} priority />
            </span>
            <span className="site-brand-text">
              <strong>Sheetomatic AI</strong>
              <small>WhatsApp automation & CRM</small>
            </span>
          </Link>
          <nav
            className="site-nav-saas site-nav-desktop hidden min-[901px]:flex items-center gap-6"
            aria-label="Sheetomatic AI"
          >
            {aiNav.map((item) => (
              <Link
                className="shrink-0 whitespace-nowrap text-inherit no-underline hover:text-green-700"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="site-header-actions ai-header-actions">
            <Link className="ab-header-workspace" href="/">
              {siteBrand.name}
            </Link>
            <Link className="ai-header-signin" href={AI_LOGIN_HREF}>
              Sign in
            </Link>
            <Link className="wa-btn-primary ai-header-start" href={AI_START_FREE_HREF}>
              Start free
            </Link>
          </div>
        </div>
        <nav
          className="site-nav-mobile hidden max-[900px]:flex items-center gap-2 overflow-x-auto pb-3"
          aria-label="Sheetomatic AI mobile"
        >
          {aiNav.map((item) => (
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

export function AiSiteFooter() {
  return (
    <footer className="site-footer-saas ai-site-footer">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="site-footer-grid site-footer-minimal">
          <div className="site-footer-brand">
            <Link className="site-brand site-brand-footer" href="/ai">
              <span className="logo-mark">
                <BrandIconMark size={26} theme="light" />
              </span>
              <span className="site-brand-text">
                <strong>Sheetomatic AI</strong>
                <small>WhatsApp AI chatbot, inbox & CRM</small>
              </span>
            </Link>
            <p>
              Automate WhatsApp with AI replies, team inbox, and lead capture -
              built for Indian MSMEs.
            </p>
          </div>
          <div>
            <p className="site-footer-col-label">Product</p>
            <Link href="/ai/chatbot">AI Chatbot</Link>
            <Link href="/ai/crm">CRM & Inbox</Link>
            <Link href="/ai/pricing">Pricing</Link>
            <Link href={AI_START_FREE_HREF}>Start free</Link>
            <Link href={AI_LOGIN_HREF}>Sign in</Link>
          </div>
          <div>
            <p className="site-footer-col-label">Company</p>
            <nav aria-label="Sheetomatic company links">
              <Link href="/">Main website</Link>
              <Link href="/services">Services</Link>
              <Link href="/products">Products</Link>
              <Link href="/about">About</Link>
              <Link href="/career">Careers</Link>
              <Link href="/contact">Contact</Link>
            </nav>
            <ContactButtons
              className="mt-3"
              whatsappClassName="footer-inline-btn footer-whatsapp-btn"
              whatsappLabel={whatsappDisplayNumber}
              callClassName="footer-inline-btn"
              callLabel="Call"
            />
          </div>
        </div>
        <div className="site-footer-bottom">
          <span>Sheetomatic AI by {siteBrand.name}</span>
          <span>WhatsApp automation for growing businesses</span>
        </div>
      </div>
    </footer>
  );
}
