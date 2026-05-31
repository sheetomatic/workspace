import type { Metadata } from "next";
import { BarChart3, Database, GraduationCap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  FinalCta,
  MarketingPage,
  PageHero,
  SiteFooter,
  SiteHeader,
} from "../components";
import { aboutPage } from "../page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "About",
  description:
    "Founder-led automation and AI consultancy for Indian MSMEs — Google Workspace, MIS, and practical systems your team will use.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <MarketingPage>
      <SiteHeader />
      <PageHero
        eyebrow={aboutPage.eyebrow}
        title={aboutPage.title}
        text={aboutPage.lead}
      />
      <section className="section bg-white pb-20">
        <div className="about-founder-grid mx-auto max-w-5xl gap-10 px-5 sm:px-8">
          <div className="about-founder-copy">
            <p className="type-lead">
              Sheetomatic builds systems around how MSME teams already work:
              Google Sheets, AppSheet, Looker Studio, client workspaces, and
              WhatsApp. Less manual follow-up, cleaner data, faster decisions.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Database, label: "MIS automation", tone: "tone-sky" },
                { icon: BarChart3, label: "Dashboards", tone: "tone-indigo" },
                { icon: GraduationCap, label: "Training", tone: "tone-emerald" },
              ].map(({ icon: Icon, label, tone }) => (
                <div className="founder-point" key={label}>
                  <span className={`marketing-icon sm ${tone}`} aria-hidden>
                    <Icon size={20} />
                  </span>
                  {label === "Training" ? (
                    <Link href="/courses">{label}</Link>
                  ) : (
                    <span>{label}</span>
                  )}
                </div>
              ))}
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
              <strong>Shyam Kumar Banjare</strong>
              <span>Founder, Sheetomatic</span>
            </div>
          </div>
        </div>
      </section>
      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
