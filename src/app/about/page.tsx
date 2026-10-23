import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BarChart3, Database, GraduationCap } from "lucide-react";
import Image from "next/image";
import {
  FinalCta,
  MarketingPage,
  SiteFooter,
  SiteHeader,
} from "../components";
import { aboutPage } from "../page-content";
import { HowWeWorkSection } from "@/components/marketing/how-we-work-section";
import { WorkShowcaseSection } from "@/components/marketing/client-projects-showcase";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "About",
  description:
    "Meet Sheetomatic: founder-led software and systems built around how Indian MSMEs work, with setup, team training, and ongoing support.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <MarketingPage>
      <SiteHeader />
      <section className="about-hero">
        <div className="about-hero-inner mx-auto max-w-7xl px-5 sm:px-8">
          <div className="about-hero-copy">
            <p className="about-eyebrow">{aboutPage.eyebrow}</p>
            <h1>{aboutPage.title}</h1>
            <p className="about-hero-lead">{aboutPage.lead}</p>
            <div className="about-hero-actions">
              <Link className="about-primary-link" href="/contact">
                Talk through your workflow <ArrowUpRight size={18} aria-hidden />
              </Link>
              <Link className="about-secondary-link" href="#our-work">See the work</Link>
            </div>
            <div className="about-promise-row" aria-label="How we work">
              <span>Founder-led</span><span>Built around your process</span><span>Team-ready setup</span>
            </div>
          </div>
          <div className="founder-photo about-founder-photo">
            <Image
              src="/images/founder-shyam.jpg"
              alt="Shyam Kumar Banjare, founder of Sheetomatic"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="founder-image"
              priority
            />
            <div className="founder-caption">
              <span className="about-founder-label">A practical approach to business systems</span>
              <strong>Shyam Kumar Banjare</strong>
              <span>Founder, Sheetomatic</span>
            </div>
          </div>
        </div>
      </section>
      <section className="about-belief-section" aria-labelledby="about-belief-title">
        <div className="about-belief-grid mx-auto max-w-7xl px-5 sm:px-8">
          <div className="about-belief-heading">
            <p className="about-eyebrow">Why Sheetomatic</p>
            <h2 id="about-belief-title">Good software should make work feel clearer.</h2>
          </div>
          <div className="about-belief-copy">
            <p>
              Growing teams rarely need another tool to maintain. They need the work they
              already do—orders, stock, follow-ups, approvals, and reporting—to connect
              in a way people can actually use.
            </p>
            <p>
              We bring the process, technology, and people together: understand the real
              workflow, configure the right system, and help the team make it part of the
              everyday rhythm.
            </p>
          </div>
          <div className="about-principles">
            {[
              { icon: Database, title: "Start with reality", text: "We map the handoffs and bottlenecks your team deals with today.", tone: "tone-sky" },
              { icon: BarChart3, title: "Make progress visible", text: "Owners, next steps, and exceptions become easier to see.", tone: "tone-indigo" },
              { icon: GraduationCap, title: "Make it stick", text: "We set up the system with your people and train them to run it.", tone: "tone-emerald" },
            ].map(({ icon: Icon, title, text, tone }) => (
              <article className="about-principle" key={title}>
                <span className={`marketing-icon sm ${tone}`} aria-hidden><Icon size={20} /></span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <HowWeWorkSection />
      <WorkShowcaseSection />
      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
