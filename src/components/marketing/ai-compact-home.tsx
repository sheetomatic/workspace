import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Inbox, MessageCircle, Radio, Sparkles } from "lucide-react";
import { AiSiteFooter, AiSiteHeader } from "@/components/marketing/ai-site-chrome";
import { AI_LOGIN_HREF, AI_START_FREE_HREF } from "@/lib/ai-auth-links";
import { launchSteps } from "@/app/product-content";
import "./wa-product.css";

const highlights = [
  { icon: MessageCircle, label: "AI captures leads 24/7" },
  { icon: Inbox, label: "Inbox and CRM convert chats" },
  { icon: BookOpen, label: "Follow-up tasks stay on track" },
  { icon: Radio, label: "Shared inbox, humans close" },
];

export function AiCompactHomePage() {
  return (
    <main className="marketing-page marketing-site wa-product-page wa-ai-compact">
      <AiSiteHeader />

      <section className="wa-ai-compact-hero">
        <div className="wa-product-container">
          <div className="wa-ai-compact-hero-inner">
            <span className="wa-product-kicker">
              <Sparkles size={14} aria-hidden />
              Sheetomatic AI
            </span>
            <h1>A WhatsApp system to attract, convert, and scale sales</h1>
            <p className="wa-ai-compact-lead">
              Capture leads with AI. Convert in shared inbox and CRM. Empower your team to
              close while AI handles routine replies.
            </p>
            <div className="wa-ai-compact-hero-actions">
              <Link className="wa-btn-primary" href={AI_START_FREE_HREF}>
                Start free
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link className="wa-btn-secondary" href={AI_LOGIN_HREF}>
                Sign in
              </Link>
              <Link className="wa-ai-pricing-link" href="/ai/pricing">
                Enquire pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Go live" className="wa-ai-golive-block" id="go-live">
        <div className="wa-product-container">
          <div className="wa-ai-golive-grid">
            <div className="wa-ai-golive-main">
              <span className="wa-product-kicker">Go live</span>
              <h2>Install your WhatsApp sales system in three steps</h2>
              <p className="wa-ai-golive-sub">
                A repeatable go-live process. Connect, train, and launch without developers
                or scattered tools.
              </p>
              <ol className="wa-ai-golive-steps">
                {launchSteps.map((step) => (
                  <li key={step.title}>
                    <span className="wa-ai-golive-step-num">{step.step}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="wa-ai-signup-card">
              <p className="wa-ai-signup-kicker">Free workspace</p>
              <h3>Create your Sheetomatic AI account</h3>
              <p className="wa-ai-signup-copy">
                Start free, then connect WhatsApp and go live when your knowledge base is
                ready.
              </p>
              <Link className="wa-btn-primary wa-ai-signup-btn" href={AI_START_FREE_HREF}>
                Create free account
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link className="wa-ai-signin-link" href={AI_LOGIN_HREF}>
                Already have an account? <strong>Sign in</strong>
              </Link>
              <ul className="wa-ai-signup-trust">
                <li>
                  <CheckCircle2 size={16} aria-hidden />
                  Official WhatsApp Business API
                </li>
                <li>
                  <CheckCircle2 size={16} aria-hidden />
                  Team inbox with human takeover
                </li>
                <li>
                  <CheckCircle2 size={16} aria-hidden />
                  Knowledge-trained AI replies
                </li>
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section aria-label="Platform highlights" className="wa-ai-compact-highlights">
        <div className="wa-product-container">
          <div className="wa-ai-highlight-row">
            {highlights.map(({ icon: Icon, label }) => (
              <div className="wa-ai-highlight-pill" key={label}>
                <Icon size={16} aria-hidden />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AiSiteFooter />
    </main>
  );
}
