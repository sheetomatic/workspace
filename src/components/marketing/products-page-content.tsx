import {
  ArrowDownRight,
  ArrowRight,
  Building2,
  ClipboardCheck,
  Gauge,
  MapPin,
  PackageCheck,
  Truck,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { FinalCta, MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { ContactButtons } from "./marketing-buttons";
import { whatsappDisplayNumber } from "@/app/site-content";
import "./minimal-premium.css";
import "./case-studies-page.css";

const caseStudies: {
  client: string;
  location: string;
  industry: string;
  title: string;
  icon: LucideIcon;
  before: string;
  built: string;
  after: string;
  flow: string[];
}[] = [
  {
    client: "PPCPL · Pawar Patkar Constructions",
    location: "Pune, India",
    industry: "Construction",
    title: "From vendor onboarding to site delivery, without losing the thread.",
    icon: Building2,
    before:
      "Construction work moves through vendors, contracts, work orders, and site teams. Every handoff needs the right material and progress update to reach the next person.",
    built:
      "A connected vendor-to-site workflow for onboarding, work orders, material issues, and transfers.",
    after:
      "The team can follow each job from its source through site delivery, with the work and material movement in one operating flow.",
    flow: ["Vendor", "Work order", "Site delivery"],
  },
  {
    client: "Borade Poultry Farm",
    location: "Mumbai, India",
    industry: "Poultry & distribution",
    title: "A mobile view of the journey from egg purchase to delivery.",
    icon: Truck,
    before:
      "In a supply chain, procurement, stock, and dispatch all move together. If updates do not travel with the work, teams have to piece together what is ready and what is next.",
    built:
      "A mobile workflow that connects egg procurement, stock tracking, and dispatch coordination.",
    after:
      "Updates are captured across the supply chain on mobile, helping the team coordinate the next step from a shared view.",
    flow: ["Procurement", "Stock", "Dispatch"],
  },
  {
    client: "Kavlin Struc",
    location: "Dhamtari, India",
    industry: "Prefab & PEB building",
    title: "A more dependable path from project enquiry to quotation.",
    icon: Workflow,
    before:
      "Prefab and PEB sales depend on accurate project details. Enquiries, checks, and quotations need to stay connected as a prospect moves forward.",
    built:
      "A CRM with validation workflows and a quotation system shaped for prefab and PEB project sales.",
    after:
      "The sales team can work from a validated pipeline and carry project information into quotations with clearer handoffs.",
    flow: ["Enquiry", "Validation", "Quotation"],
  },
  {
    client: "Altasnim",
    location: "Oman",
    industry: "Oil & gas",
    title: "HSE activity across clusters, brought into one management view.",
    icon: Gauge,
    before:
      "When health, safety, and environment performance spans multiple clusters, leaders need a clear way to see violations, penalties, and performance together.",
    built:
      "An HSE dashboard that brings cluster-level violations, penalties, and performance into a real-time view.",
    after:
      "Managers can review the operating picture across clusters and spot the areas that need attention sooner.",
    flow: ["Cluster updates", "HSE data", "Dashboard"],
  },
  {
    client: "DNM Flora",
    location: "India",
    industry: "Steel bar trading",
    title: "Quotes, orders, and dispatch coordination in one flow.",
    icon: PackageCheck,
    before:
      "Steel trading has several linked steps: a quote becomes an order, and the order needs to be coordinated through dispatch without losing its context.",
    built:
      "A sales-to-dispatch system that connects quotes, confirmed orders, and dispatch coordination.",
    after:
      "The team can trace the order journey in sequence and keep sales and dispatch working from the same status.",
    flow: ["Quote", "Order", "Dispatch"],
  },
  {
    client: "MPCC",
    location: "Dehradun, India",
    industry: "Medical waste collection",
    title: "Field collections and team activity made easier to follow.",
    icon: ClipboardCheck,
    before:
      "Collection operations depend on a reliable handoff between sales, route work, and field attendance. Managers need to know what has been covered and what remains.",
    built:
      "A collection workflow connecting sales to field collection, attendance, and staff tracking across routes.",
    after:
      "Office and field teams can work from a clearer record of route activity and collection progress.",
    flow: ["Sales", "Route & team", "Collection"],
  },
];

export function ProductsPageContent() {
  return (
    <MarketingPage>
      <SiteHeader />
      <main className="case-studies-page">
        <section className="case-studies-hero">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
            <p className="case-studies-kicker">Case studies · real work, made clearer</p>
            <h1>Before, work was scattered.<br />Now, the system carries it forward.</h1>
            <p className="case-studies-hero-lead">
              Every business has its own way of getting work done. We learn that process,
              build the apps and software around it, and help the team make the new system part of the workday.
            </p>
            <a className="case-studies-hero-cta" href="#stories">
              Explore the stories <ArrowDownRight size={18} aria-hidden />
            </a>
            <div className="case-studies-hero-note">
              <span className="case-studies-pulse" aria-hidden="true" />
              Real teams · practical systems · supported rollout
            </div>
          </div>
        </section>

        <section className="case-studies-list" id="stories" aria-labelledby="case-studies-title">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
            <header className="case-studies-heading">
              <p className="case-studies-kicker">The work behind the software</p>
              <h2 id="case-studies-title">Different businesses. One clearer way to work.</h2>
              <p>Here is what teams were trying to manage, the system we built with them, and what became easier to follow.</p>
            </header>

            <div className="case-studies-stack">
              {caseStudies.map((story, index) => {
                const Icon = story.icon;
                return (
                  <article className="case-story" key={story.client}>
                    <header className="case-story-header">
                      <span className="case-story-index">0{index + 1}</span>
                      <span className="case-story-icon"><Icon size={24} strokeWidth={1.8} aria-hidden="true" /></span>
                      <div className="case-story-identity">
                        <p>{story.client}</p>
                        <span><MapPin size={13} aria-hidden="true" /> {story.location}</span>
                      </div>
                      <span className="case-story-industry">{story.industry}</span>
                    </header>

                    <h3>{story.title}</h3>

                    <div className="case-story-flow" aria-label={`Workflow: ${story.flow.join(" to ")}`}>
                      {story.flow.map((step, stepIndex) => (
                        <span className="case-story-flow-step" key={step}>
                          {stepIndex > 0 ? <ArrowRight size={15} aria-hidden="true" /> : null}
                          <span>{step}</span>
                        </span>
                      ))}
                    </div>

                    <div className="case-story-columns">
                      <section>
                        <span className="case-story-label">The starting point</span>
                        <p>{story.before}</p>
                      </section>
                      <section>
                        <span className="case-story-label">What Sheetomatic built</span>
                        <p>{story.built}</p>
                      </section>
                      <section className="case-story-result">
                        <span className="case-story-label">How work moves now</span>
                        <p>{story.after}</p>
                      </section>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="case-studies-contact">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 lg:py-20">
            <p className="case-studies-kicker">Your process can be next</p>
            <h2>Tell us what work looks like before the system.</h2>
            <p>We will help map the first workflow worth making easier to run.</p>
            <ContactButtons
              className="contact-actions centered cta-stack mx-auto mt-6"
              whatsappClassName="btn-block"
              whatsappLabel={whatsappDisplayNumber}
              callClassName="btn-block"
            />
          </div>
        </section>
      </main>
      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
