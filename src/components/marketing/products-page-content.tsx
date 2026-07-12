import { FinalCta, MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import {
  clientProblems,
  problemSolutionPresets,
  productCategories,
  productsPage,
} from "@/app/page-content";
import "./minimal-premium.css";
import {
  BarChart3,
  Bot,
  Building2,
  ClipboardCheck,
  GitBranch,
  ListTodo,
  MessageCircle,
  Package,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { ContactButtons } from "./marketing-buttons";
import { ProblemSolutionVisualSection } from "./problem-solution-visual";
import { whatsappDisplayNumber } from "@/app/site-content";

const productIconByName: Record<string, { icon: LucideIcon; tone: string }> = {
  "FMS — Flow Monitoring": { icon: Workflow, tone: "tone-sky" },
  "IMS — Inventory Management": { icon: Package, tone: "tone-indigo" },
  "Process Coordinator": { icon: ClipboardCheck, tone: "tone-violet" },
  "Executive Assistant": { icon: ListTodo, tone: "tone-sky" },
  "Executive Meeting (Weekly)": { icon: BarChart3, tone: "tone-emerald" },
  "WhatsApp AI chatbot": { icon: Bot, tone: "tone-green" },
  "Sheetomatic AI CRM": { icon: Sparkles, tone: "tone-green" },
  "Sheetomatic Workspace": { icon: GitBranch, tone: "tone-amber" },
  "Custom Software": { icon: Building2, tone: "tone-slate" },
};

export function ProductsPageContent() {
  return (
    <MarketingPage>
      <SiteHeader />
      <section className="minimal-hero minimal-hero-centered">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8">
          <p className="type-kicker text-sky-700">{productsPage.eyebrow}</p>
          <h1 className="minimal-hero-title mt-4">{productsPage.title}</h1>
          <p className="minimal-hero-lead">{productsPage.lead}</p>
        </div>
      </section>

      <section className="products-catalog minimal-strip bg-white pb-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="product-minimal-grid">
            {productCategories.map((product) => {
              const meta =
                productIconByName[product.name] ?? {
                  icon: MessageCircle,
                  tone: "tone-sky",
                };
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

      <ProblemSolutionVisualSection
        cardIds={problemSolutionPresets.products}
        title="See each module close a leak"
        lead="Before → after for every core product — watch the demo, then open the workspace."
      />

      <section className="resolution-blue-strip" aria-label="How Sheetomatic works">
        <div className="mx-auto max-w-5xl px-5 text-center sm:px-8">
          <p>{clientProblems.resolution}</p>
        </div>
      </section>

      <section className="minimal-strip bg-white pb-20">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <p className="type-body-sm mx-auto max-w-xl text-slate-500">
            Scope and delivery timeline are confirmed on WhatsApp.
          </p>
          <ContactButtons
            className="contact-actions centered cta-stack mx-auto mt-6"
            whatsappClassName="btn-block"
            whatsappLabel={whatsappDisplayNumber}
            callClassName="btn-block"
          />
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
