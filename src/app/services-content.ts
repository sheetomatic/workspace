/** Service category hub + sub-page content for /services and /services/[slug] */

import {
  workspaceLoginHref,
  workspacePortalOrigin,
} from "@/lib/workspace-auth-links";
import { hrWorkspaceModules } from "./hr-module-content";

export type ServiceCategorySlug =
  | "hr"
  | "tasks"
  | "whatsapp-ai"
  | "mis"
  | "crm"
  | "inventory"
  | "flow"
  | "checklist"
  | "automation";

export type ServiceCategory = {
  slug: ServiceCategorySlug;
  name: string;
  shortDescription: string;
  /** One-line benefit for related-service cards on detail pages */
  relatedBenefit: string;
  hubBlurb: string;
  eyebrow: string;
  title: string;
  titleAccent?: string;
  lead: string;
  features: { title: string; detail: string }[];
  outcomes: string[];
  problem: string;
  problemDetail: string;
  ctaLabel: string;
  whatsappMessage: string;
  workspaceHref?: string;
  workspaceCta?: string;
  featured?: boolean;
  relatedSlugs?: ServiceCategorySlug[];
};

/** Hub browse grid — order and labels for /services category cards */
export const servicesBrowseCards: {
  slug: ServiceCategorySlug;
  label: string;
}[] = [
  { slug: "flow", label: "FMS — Flow Monitoring" },
  { slug: "inventory", label: "IMS — Inventory" },
  { slug: "checklist", label: "Process Coordinator" },
  { slug: "whatsapp-ai", label: "WhatsApp AI" },
  { slug: "mis", label: "Executive Meeting (Weekly)" },
  { slug: "automation", label: "Custom Software" },
];

/** Display labels for related cards and nav — aligned with services hub */
export const serviceDisplayLabels: Record<ServiceCategorySlug, string> = {
  flow: "FMS — Flow Monitoring",
  inventory: "IMS — Inventory",
  checklist: "Process Coordinator",
  "whatsapp-ai": "WhatsApp AI",
  mis: "Executive Meeting (Weekly)",
  tasks: "Executive Assistant",
  hr: "HR & workforce",
  crm: "AI-powered CRM",
  automation: "Custom Software",
};

export function getServiceDisplayLabel(slug: ServiceCategorySlug): string {
  return serviceDisplayLabels[slug] ?? serviceCategoryBySlug[slug].name;
}

export const servicesHub = {
  eyebrow: "For running MSMEs",
  title: "Systems that replace",
  titleAccent: "firefighting — not consulting decks.",
  lead:
    "Built for owner-led businesses with a team and real payroll — not startup pilots. We Build your workspace, Manage until Checklist and Tasks modules run daily with Process Coordinator and Executive Assistant roles on their portals, and Scale modules as margin leaks close. You manage from the Monday board, not every task.",
  browseTitle: "Pick the leak. We wire the system.",
  browseLead:
    "Each system module ships as a running workspace — not a one-time setup call. Start where margin hurts most; we connect the rest on Build-Manage-Scale.",
  deliveryNote:
    "Most running MSMEs start with FMS or WhatsApp AI. IMS, Checklist and Tasks modules, and Executive Meeting plug in once the first rhythm sticks — custom modules when your process outgrows standard systems.",
};

export const serviceCategories: ServiceCategory[] = [
  {
    slug: "flow",
    name: "FMS — Flow Monitoring",
    shortDescription: "Enquiry to dispatch, payment, and closure with stage owners.",
    relatedBenefit: "Stage owners and stall alerts before customers call.",
    hubBlurb: "Margin leaks when orders stall mid-pipeline — stage owners and nudges before the customer calls.",
    eyebrow: "FMS",
    title: "Flow monitoring from",
    titleAccent: "enquiry to closure.",
    lead:
      "Stage-based visibility with named owners and automatic nudges when work stalls — enquiry, dispatch, payment, and delivery on one trail.",
    problem: "Orders stall between enquiry and closure",
    problemDetail:
      "Nobody sees where an order stuck — enquiry, dispatch, payment, or delivery.",
    features: [
      {
        title: "Stage-based boards",
        detail: "Every order shows current step, owner, and age.",
      },
      {
        title: "Stall detection",
        detail: "AI nudges when a step exceeds your SLA — before the customer calls.",
      },
      {
        title: "Payment & dispatch linkage",
        detail: "Cash, credit, and logistics visible on the same record.",
      },
      {
        title: "WhatsApp status updates",
        detail: "Customer-facing updates from the same system data.",
      },
    ],
    outcomes: [
      "Fewer orders dying quietly in the middle",
      "Owners see bottlenecks by stage — not anecdotes",
      "Customer updates without manual copy-paste",
    ],
    ctaLabel: "Scope FMS on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope flow monitoring from enquiry through dispatch and payment.",
    relatedSlugs: ["inventory", "tasks", "mis"],
    featured: true,
  },
  {
    slug: "inventory",
    name: "IMS — Inventory",
    shortDescription: "Stock in/out, locations, and reorder signals tied to daily ops.",
    relatedBenefit: "Live stock tied to sales — reorder before stockouts.",
    hubBlurb: "Stock drift eats margin — live ledger and reorder signals tied to how you sell and buy.",
    eyebrow: "IMS",
    title: "Inventory that",
    titleAccent: "matches how you sell and buy.",
    lead:
      "End-to-end stock movements, locations, reorder signals, and alerts — tied to the same workspace your team uses every day.",
    problem: "Stock on paper does not match reality",
    problemDetail:
      "Inventory registers drift from sales and purchases. Reorders are guesswork.",
    features: [
      {
        title: "Live stock ledger",
        detail: "In/out movements connected to sales and purchase data.",
      },
      {
        title: "Location & SKU views",
        detail: "Multi-location and variant tracking without parallel registers.",
      },
      {
        title: "Reorder signals",
        detail: "Threshold alerts before you lose the sale to stockouts.",
      },
      {
        title: "Owner dashboard tie-in",
        detail: "Stock exceptions surface in the same reports owners already open.",
      },
    ],
    outcomes: [
      "Purchasing decisions from current stock — not last month's guess",
      "Fewer emergency runs and dead stock surprises",
      "Finance and warehouse aligned on one number",
    ],
    ctaLabel: "Scope IMS on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope inventory management connected to our daily sales and purchase flow.",
    workspaceHref: "/products",
    workspaceCta: "See products",
    relatedSlugs: ["flow", "mis", "tasks"],
    featured: true,
  },
  {
    slug: "checklist",
    name: "Process Coordinator",
    shortDescription: "SOP checklists on mobile — Checklist module; Process Coordinator role monitors via the PC portal.",
    relatedBenefit: "Shift proof rolls up — managers coach from data, not memory.",
    hubBlurb: "Shift standards on the Checklist module — Process Coordinator role scores via the PC portal so you are not walking the floor chasing ticks.",
    eyebrow: "Process Coordinator",
    title: "Checklists your team",
    titleAccent: "actually completes.",
    lead:
      "Standard operating checklists on mobile — timestamps, photos, and exception flags. Checklist module captures every shift; Process Coordinator role monitors via the PC portal so managers coach from data, not memory.",
    problem: "SOPs live on paper nobody updates",
    problemDetail:
      "Checklists get skipped, photos never attach, and managers find out too late.",
    features: [
      {
        title: "Mobile-first rounds",
        detail: "Plant, facility, and shift checklists completed from the field.",
      },
      {
        title: "Photo & timestamp proof",
        detail: "Every step logged — not trust-based tick marks.",
      },
      {
        title: "Exception flags",
        detail: "Missed steps and overdue rounds surface to managers instantly.",
      },
      {
        title: "Area templates",
        detail: "Maintenance, accounts, and HR checklists configured per your process.",
      },
    ],
    outcomes: [
      "Compliance visible the same day — not after an audit",
      "Fewer repeat incidents from missed steps",
      "Managers coach from data — not memory",
    ],
    ctaLabel: "Scope Process Coordinator on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope Process Coordinator checklists for our maintenance, accounts, or HR operations.",
    relatedSlugs: ["tasks", "mis", "flow"],
    featured: true,
  },
  {
    slug: "whatsapp-ai",
    name: "WhatsApp AI",
    shortDescription: "24/7 replies, qualification, and team inbox on official API.",
    relatedBenefit: "Night leads qualified — handoff to your team with context.",
    hubBlurb: "Night leads become owned tasks — AI qualifies and hands off so you are not the 24/7 reply desk.",
    eyebrow: "Customer conversations",
    title: "WhatsApp AI that",
    titleAccent: "qualifies, replies, and hands off cleanly.",
    lead:
      "Official WhatsApp Business API with AI tuned to your products, policies, and tone — plus a team inbox so humans take over without losing context.",
    problem: "Night-time WhatsApp leads go unanswered",
    problemDetail:
      "Customers message after hours. Your team replies late — or not at all.",
    features: [
      {
        title: "AI-first replies",
        detail:
          "Product FAQs, order status, and lead qualification without waiting for a human.",
      },
      {
        title: "Team inbox & handoff",
        detail:
          "Route hot leads to the right owner with conversation history intact.",
      },
      {
        title: "Templates & compliance",
        detail:
          "Approved templates, opt-in flows, and API setup handled with Sheetomatic.",
      },
      {
        title: "Connected to tasks & reports",
        detail:
          "Follow-ups and exceptions sync to your workspace — not parallel chats.",
      },
    ],
    outcomes: [
      "Leads qualified before your team wakes up",
      "One inbox instead of scattered personal WhatsApp",
      "AI tuned post go-live until replies match your business",
    ],
    ctaLabel: "Scope WhatsApp AI on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope WhatsApp AI — official API, AI replies, and team inbox for our business.",
    workspaceHref: "/ai",
    workspaceCta: "Explore Sheetomatic AI",
    featured: true,
    relatedSlugs: ["tasks", "flow", "crm"],
  },
  {
    slug: "mis",
    name: "Executive Meeting (Weekly)",
    shortDescription: "Monday board ready automatically — person-wise deficit, exceptions, zero MIS prep.",
    relatedBenefit: "Checklist and Tasks module scores assembled — discuss exceptions only.",
    hubBlurb: "Monday numbers you trust — board assembled automatically, discuss exceptions only, zero owner MIS prep.",
    eyebrow: "Executive Meeting (Weekly)",
    title: "Your Monday board",
    titleAccent: "ready without MIS assembly.",
    lead:
      "Executive Meeting (Weekly) assembles person-wise deficit, overdue flow, and team scores automatically — open Monday and discuss exceptions only, not row dumps.",
    problem: "Monday starts without a trusted executive view",
    problemDetail:
      "Executive Meeting boards are rebuilt by hand every Sunday. Owners wait on MIS instead of acting on numbers.",
    features: [
      {
        title: "Monday-ready board",
        detail: "Person-wise KRA deficit, overdue FMS lines, and team scores — assembled automatically.",
      },
      {
        title: "Exceptions only",
        detail: "Discuss what slipped — not slide decks compiled the night before.",
      },
      {
        title: "Checklist + Tasks scores roll up",
        detail: "Checklist module scores via the Process Coordinator role; Tasks module scores via the Executive Assistant role — both feed the same board owners open.",
      },
      {
        title: "Workspace-native data",
        detail:
          "Numbers flow from FMS, IMS, Checklist and Tasks modules, and Process Coordinator and Executive Assistant role scores — one source of truth, no parallel MIS tabs.",
      },
    ],
    outcomes: [
      "Monday starts with numbers you trust — not MIS assembly",
      "Stop blame game — data visible per person",
      "Manage one day a week, not chase updates daily",
    ],
    ctaLabel: "Scope Executive Meeting on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope Executive Meeting (Weekly) — Monday board without manual MIS prep.",
    workspaceHref: "/products",
    workspaceCta: "See products",
    featured: true,
    relatedSlugs: ["checklist", "tasks", "flow"],
  },
  {
    slug: "tasks",
    name: "Executive Assistant",
    shortDescription: "Voice or text on WhatsApp to task created — Tasks module; Executive Assistant role monitors via the EA portal.",
    relatedBenefit: "Speak on WhatsApp — owned task with due date and nudges.",
    hubBlurb: "Delegate from WhatsApp — Tasks module captures work; Executive Assistant role monitors follow-through via the EA portal.",
    eyebrow: "Executive Assistant",
    title: "Task delegation",
    titleAccent: "monitored, not chased on WhatsApp.",
    lead:
      "Speak or type on WhatsApp. Sheetomatic creates the task in the Tasks module, assigns the owner, sets the due date, and alerts the team — Executive Assistant role monitors delivery via the EA portal.",
    problem: "Tasks get lost in WhatsApp and memory",
    problemDetail:
      "Follow-ups depend on who remembers to chase — not the Tasks module with owners, due dates, and AI nudges.",
    features: [
      {
        title: "Voice & text capture",
        detail: "Log work from the field without opening a heavy app.",
      },
      {
        title: "Smart assignment",
        detail: "Owners, priorities, and due dates visible to managers daily.",
      },
      {
        title: "WhatsApp reminders",
        detail: "Routine follow-ups automated — humans step in on exceptions.",
      },
      {
        title: "Workspace-native",
        detail: "Same login as FMS, IMS, and Executive Meeting (Weekly) — one operating stack.",
      },
    ],
    outcomes: [
      "Managers see overdue work without asking in groups",
      "Delegated tasks linked to customers and orders where needed",
      "Less Monday-morning memory chasing",
    ],
    ctaLabel: "Scope Executive Assistant on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope Executive Assistant task delegation and WhatsApp follow-up for our team.",
    workspaceHref: workspaceLoginHref(),
    workspaceCta: "Open workspace",
    relatedSlugs: ["checklist", "mis", "whatsapp-ai"],
  },
  {
    slug: "hr",
    name: "HR & workforce",
    shortDescription: "Attendance, field teams, leave, payroll-ready data, and hiring.",
    relatedBenefit: "Payroll-ready attendance — field trail without end-of-day chats.",
    hubBlurb: "Geo check-in, field visits, and hiring in one workspace — WhatsApp-ready ops.",
    eyebrow: "Workforce operations",
    title: "HR modules for",
    titleAccent: "Indian MSME teams.",
    lead:
      "Attendance & leave with payroll-ready summaries, field executive tracking as a separate module, and hiring pipelines — in the same Sheetomatic workspace as tasks and reports.",
    problem: "No reliable attendance or leave visibility",
    problemDetail:
      "Field and office attendance live in registers and chats — nobody trusts the numbers.",
    features: [
      {
        title: "Attendance & leave",
        detail:
          "Geo-fenced check-in, leave approvals, shift-friendly hours, payroll-ready summaries.",
      },
      {
        title: "Field executive tracking",
        detail:
          "Client geo check-ins, visit notes, and manager visibility — separate from office punch.",
      },
      {
        title: "Hiring & documentation",
        detail:
          "Pipeline stages, document checklists, and interview tracking from applied to hired.",
      },
      {
        title: "Per-org enablement",
        detail:
          "Modules switched on after a short scope call — aligned to team size and readiness.",
      },
    ],
    outcomes: [
      "Payroll inputs from attendance you can defend",
      "Field team trail without end-of-day WhatsApp summaries",
      "Hiring handoffs documented — not lost in email",
    ],
    ctaLabel: "Scope HR modules on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope HR modules — attendance, field tracking, and/or hiring for our team.",
    workspaceHref: `${workspacePortalOrigin()}/login?callbackUrl=${encodeURIComponent("/app/hr")}`,
    workspaceCta: "Open HR workspace",
    relatedSlugs: ["tasks", "mis", "checklist"],
  },
  {
    slug: "crm",
    name: "AI-powered CRM",
    shortDescription: "Pipeline, leads, and customer records tied to WhatsApp.",
    relatedBenefit: "Pipeline tied to WhatsApp — not screenshot archaeology.",
    hubBlurb: "Sales history and stage — not buried in personal threads.",
    eyebrow: "Revenue operations",
    title: "CRM connected to",
    titleAccent: "how you already sell.",
    lead:
      "Lead tracking, pipeline stages, and customer records linked to WhatsApp conversations and your team inbox — one end-to-end CRM in your workspace.",
    problem: "Leads and customers scattered across chats",
    problemDetail:
      "Sales history and pipeline stage are buried in personal WhatsApp threads.",
    features: [
      {
        title: "Pipeline visibility",
        detail: "Stages, owners, and next actions on one board.",
      },
      {
        title: "WhatsApp-linked records",
        detail: "Conversations attached to accounts — not screenshot archaeology.",
      },
      {
        title: "Team inbox alignment",
        detail: "Handoffs between sales and support without losing context.",
      },
      {
        title: "Report-ready exports",
        detail: "Pipeline and collections feed owner dashboards automatically.",
      },
    ],
    outcomes: [
      "Forecast from pipeline — not gut feel",
      "New reps onboard without inheriting mystery chats",
      "Follow-ups system-driven — not owner memory",
    ],
    ctaLabel: "Scope CRM on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope an AI-powered CRM linked to our WhatsApp sales flow.",
    workspaceHref: "/ai",
    workspaceCta: "Explore Sheetomatic AI",
    relatedSlugs: ["whatsapp-ai", "tasks", "mis"],
  },
  {
    slug: "automation",
    name: "Custom Software",
    shortDescription: "Industry-specific modules, integrations, and workflows built for your process.",
    relatedBenefit: "Built on the same login as FMS, IMS, and AI — one vendor.",
    hubBlurb: "When standard systems miss your process — custom modules on the same workspace, scaled after the first win.",
    eyebrow: "Custom builds",
    title: "Custom software",
    titleAccent: "built around how you work.",
    lead:
      "Need a module, integration, or workflow that does not exist yet? Sheetomatic scopes, builds, and runs custom workspace features for MSME clients — on the same SaaS platform as FMS, IMS, and AI.",
    problem: "Your process does not fit generic software",
    problemDetail:
      "ERP demos look impressive but miss how your team actually operates. You need something built for your industry, not configured from a template.",
    features: [
      {
        title: "Process-first design",
        detail: "We map your workflow on a scope call — then build modules that match how your team works.",
      },
      {
        title: "Same workspace, one login",
        detail: "Custom features live inside Sheetomatic Workspace alongside FMS, IMS, checklists, and AI.",
      },
      {
        title: "WhatsApp & AI connected",
        detail: "Alerts, approvals, and customer conversations wired into custom flows from day one.",
      },
      {
        title: "Shipped and supported",
        detail: "We deploy, train your team, and iterate post go-live — not a one-time handoff.",
      },
    ],
    outcomes: [
      "Software that fits your operation — not the other way around",
      "Custom modules without starting a separate IT project",
      "One vendor from scope call through daily use",
    ],
    ctaLabel: "Scope custom software on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, we need custom software built for our business process. Can we scope a module or integration on your workspace?",
    workspaceHref: "/contact",
    workspaceCta: "Talk to us",
    relatedSlugs: ["flow", "inventory", "whatsapp-ai"],
  },
];

/** All service routes for header nav dropdown */
export const servicesNavLinks = [
  { href: "/services", label: "All services" },
  ...servicesBrowseCards.map(({ slug, label }) => ({
    href: `/services/${slug}`,
    label,
  })),
  ...serviceCategories
    .filter(
      (category) =>
        !servicesBrowseCards.some((card) => card.slug === category.slug),
    )
    .map((category) => ({
      href: `/services/${category.slug}`,
      label: category.name,
    })),
  ...hrWorkspaceModules.map((mod) => ({
    href: mod.marketingHref,
    label: mod.name,
  })),
];

export const serviceCategoryBySlug = Object.fromEntries(
  serviceCategories.map((c) => [c.slug, c]),
) as Record<ServiceCategorySlug, ServiceCategory>;

export function isServiceCategorySlug(
  slug: string,
): slug is ServiceCategorySlug {
  return slug in serviceCategoryBySlug;
}
