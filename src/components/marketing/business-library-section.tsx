import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  ClipboardCheck,
  GitBranch,
  GraduationCap,
  LayoutTemplate,
  Package,
  type LucideIcon,
} from "lucide-react";
import {
  serviceCategoryBySlug,
  servicesBrowseCards,
  type ServiceCategorySlug,
} from "@/app/services-content";
import "./business-library.css";

const solutionIcons: Record<ServiceCategorySlug, LucideIcon> = {
  flow: GitBranch,
  inventory: Boxes,
  checklist: ClipboardCheck,
  "whatsapp-ai": Bot,
  mis: BarChart3,
  automation: Package,
  tasks: ClipboardCheck,
  hr: ClipboardCheck,
  crm: BarChart3,
};

const exploreCards = [
  {
    href: "/templates",
    icon: LayoutTemplate,
    eyebrow: "Start faster",
    title: "Templates that match real work",
    text: "Use a ready structure for the work your team repeats, then configure it inside your workspace.",
    cta: "Browse templates",
  },
  {
    href: "/products",
    icon: Package,
    eyebrow: "Build your stack",
    title: "Stories of systems at work",
    text: "See how real teams connected flow, inventory, tasks, reporting, and communication around the work they already do.",
    cta: "Read case studies",
  },
  {
    href: "/courses",
    icon: GraduationCap,
    eyebrow: "Train the team",
    title: "Training that makes adoption stick",
    text: "Give owners and teams a practical path to using the system every day—not just attending a software demo.",
    cta: "View courses",
  },
];

export function SolutionPreview({ slug }: { slug: ServiceCategorySlug }) {
  const sample = <span>Sample view</span>;
  if (slug === "flow") return <div className="system-preview system-preview--flow" aria-hidden><div className="system-preview-bar"><b>FMS · SALES ORDER</b>{sample}</div><div className="flow-preview-stages"><i>Enquiry</i><i>Dispatch</i><i>Payment</i><i>Done</i></div><div className="preview-footer"><span>Owner: Rahul K.</span><b>Next due · 2:00 PM</b></div></div>;
  if (slug === "inventory") return <div className="system-preview system-preview--inventory" aria-hidden><div className="system-preview-bar"><b>IMS · STOCK OVERVIEW</b>{sample}</div><div className="inventory-preview-rows"><i><b>Bolts · A-01</b><em>95 · Healthy</em></i><i><b>Nuts · A-01</b><em>12 · Reorder</em></i><i><b>Washer · B-02</b><em>60 · Healthy</em></i></div><div className="preview-footer"><span>8 warehouses</span><b>Low stock alert ready</b></div></div>;
  if (slug === "checklist") return <div className="system-preview system-preview--checklist" aria-hidden><div className="system-preview-bar"><b>PC JOBS · SHIFT CHECKLIST</b>{sample}</div><div className="checklist-preview-rows"><i>✓ Opening checks <b>Photo proof</b></i><i>✓ Stock count <b>Verified</b></i><i>✓ Dispatch proof <b>Photo proof</b></i><i>○ Close the day <b>Next</b></i></div></div>;
  if (slug === "whatsapp-ai") return <div className="system-preview system-preview--whatsapp" aria-hidden><div className="system-preview-bar"><b>WHATSAPP AI · TEAM INBOX</b>{sample}</div><div className="whatsapp-preview-chat"><i>Can you share today&apos;s price?</i><b>Price sent · follow-up scheduled ✓</b></div><div className="preview-footer"><span>Lead captured</span><b>Owner notified</b></div></div>;
  if (slug === "mis") return <div className="system-preview system-preview--mis" aria-hidden><div className="system-preview-bar"><b>EM · MONDAY REVIEW</b>{sample}</div><div className="mis-preview-metrics"><span><b>94%</b><small>On plan</small></span><span><b>12</b><small>Open actions</small></span><span><b>4</b><small>Need attention</small></span></div><div className="mis-preview-chart"><i /><i /><i /><i /><i /></div></div>;
  if (slug === "tasks") return <div className="system-preview system-preview--tasks" aria-hidden><div className="system-preview-bar"><b>EXECUTIVE ASSISTANT · MY WORK</b>{sample}</div><div className="task-preview-list"><i><b>Call supplier · PO-204</b><em>Due 11:30</em></i><i><b>Upload dispatch proof</b><em>In progress</em></i><i><b>Confirm customer receipt</b><em>Waiting</em></i></div><div className="preview-footer"><span>3 assigned to you</span><b>1 due today</b></div></div>;
  if (slug === "crm") return <div className="system-preview system-preview--crm" aria-hidden><div className="system-preview-bar"><b>CRM · LEAD PIPELINE</b>{sample}</div><div className="crm-preview-summary"><span><b>24</b><small>Open leads</small></span><span><b>8</b><small>Follow-ups due</small></span></div><div className="crm-preview-leads"><i><b>Northstar Traders</b><em>Qualified · Amit</em></i><i><b>Maple Industries</b><em>Follow-up · Neha</em></i></div></div>;
  if (slug === "hr") return <div className="system-preview system-preview--hr" aria-hidden><div className="system-preview-bar"><b>HR · TEAM ATTENDANCE</b>{sample}</div><div className="hr-preview-summary"><span><b>42</b><small>Present</small></span><span><b>3</b><small>On leave</small></span><span><b>2</b><small>Field team</small></span></div><div className="hr-preview-row"><i /><span>Field check-in verified</span><b>09:12 AM</b></div></div>;
  if (slug === "automation") return <div className="system-preview system-preview--automation" aria-hidden><div className="system-preview-bar"><b>CUSTOM SOFTWARE · WORKFLOW</b>{sample}</div><div className="automation-preview-flow"><i>New order</i><b>→</b><i>Assign owner</i><b>→</b><i>Alert team</i></div><div className="preview-footer"><span>Built for your process</span><b>Connected workspace</b></div></div>;
  return <div className="system-preview system-preview--default" aria-hidden><div className="system-preview-bar"><b>YOUR WORKSPACE</b>{sample}</div><div className="default-preview-lines"><i /><i /><i /></div></div>;
}

export function BusinessLibrarySection() {
  return (
    <section className="business-library section" id="solutions" aria-labelledby="solutions-title">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="business-library-head">
          <p className="type-kicker">The Sheetomatic system library</p>
          <h2 id="solutions-title">Pick the business problem. Build the system around it.</h2>
          <p>
            Every solution starts with the work that is leaking time, margin, or visibility—then connects to the same workspace as your business grows.
          </p>
        </div>

        <div className="business-library-grid">
          {servicesBrowseCards.map(({ slug, label }, index) => {
            const solution = serviceCategoryBySlug[slug];
            const Icon = solutionIcons[slug];

            return (
              <Link className="business-library-solution" href={`/services/${slug}`} key={slug}>
                <div className="business-library-solution-top">
                  <span className="business-library-count">{String(index + 1).padStart(2, "0")}</span>
                  <Icon size={21} aria-hidden />
                </div>
                <SolutionPreview slug={slug} />
                <h3>{label}</h3>
                <p>{solution.shortDescription}</p>
                <span className="business-library-link">Explore system <ArrowUpRight size={16} aria-hidden /></span>
              </Link>
            );
          })}
        </div>

        <div className="business-library-explore" aria-label="Explore Sheetomatic">
          {exploreCards.map(({ href, icon: Icon, eyebrow, title, text, cta }) => (
            <Link className="business-library-explore-card" href={href} key={href}>
              <Icon size={23} aria-hidden />
              <p>{eyebrow}</p>
              <h3>{title}</h3>
              <span>{text}</span>
              <strong>{cta} <ArrowUpRight size={16} aria-hidden /></strong>
            </Link>
          ))}
        </div>

        <div className="business-library-footnote">
          <BookOpen size={18} aria-hidden />
          <p><strong>Not sure where to begin?</strong> Start with the daily process that needs the most owner follow-up. We will map the first system worth building.</p>
          <Link href="/services">See all solutions <ArrowUpRight size={16} aria-hidden /></Link>
        </div>
      </div>
    </section>
  );
}
