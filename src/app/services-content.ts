/** Service category hub + sub-page content for /services and /services/[slug] */

export type ServiceCategorySlug =
  | "hr"
  | "tasks"
  | "whatsapp-ai"
  | "mis"
  | "crm"
  | "inventory"
  | "flow"
  | "automation";

export type ServiceCategory = {
  slug: ServiceCategorySlug;
  name: string;
  shortDescription: string;
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

export const servicesHub = {
  eyebrow: "AI-powered operations",
  title: "Services built for",
  titleAccent: "how Indian MSMEs actually run.",
  lead:
    "Browse by category  -  HR, tasks, WhatsApp AI, MIS, CRM, inventory, flow, and automation. Each area is scoped, built, and supported end to end on one call.",
  browseTitle: "Browse by service",
  browseLead:
    "Pick the category closest to your pain today. We connect the rest once the first win sticks.",
  deliveryNote:
    "Most owners start with WhatsApp AI or MIS. HR, inventory, and flow modules plug in when the team is ready.",
};

export const serviceCategories: ServiceCategory[] = [
  {
    slug: "whatsapp-ai",
    name: "WhatsApp AI",
    shortDescription: "24/7 replies, qualification, and team inbox on official API.",
    hubBlurb: "Night leads answered, orders updated, human handoff when it matters.",
    eyebrow: "Customer conversations",
    title: "WhatsApp AI that",
    titleAccent: "qualifies, replies, and hands off cleanly.",
    lead:
      "Official WhatsApp Business API with AI tuned to your products, policies, and tone  -  plus a team inbox so humans take over without losing context.",
    problem: "Night-time WhatsApp leads go unanswered",
    problemDetail:
      "Customers message after hours. Your team replies late  -  or not at all.",
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
        title: "Connected to MIS & tasks",
        detail:
          "Follow-ups and exceptions sync to dashboards and delegated work  -  not parallel chats.",
      },
    ],
    outcomes: [
      "Leads qualified before your team wakes up",
      "One inbox instead of scattered personal WhatsApp",
      "AI tuned post go-live until replies match your business",
    ],
    ctaLabel: "Scope WhatsApp AI on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope WhatsApp AI  -  official API, AI replies, and team inbox for our business.",
    workspaceHref: "/ai",
    workspaceCta: "Explore Sheetomatic AI",
    featured: true,
    relatedSlugs: ["crm", "mis", "tasks"],
  },
  {
    slug: "mis",
    name: "MIS & reporting",
    shortDescription: "Daily dashboards, monthly MIS, and AI-flagged exceptions.",
    hubBlurb: "Owner numbers you trust  -  with alerts when collections or KPIs drift.",
    eyebrow: "Owner visibility",
    title: "MIS and dashboards",
    titleAccent: "you can act on the same day.",
    lead:
      "Daily Looker Studio views, monthly MIS packs, and AI-assisted exception flags  -  built on the sheets and workflows your team already uses.",
    problem: "Owner numbers arrive too late to act",
    problemDetail:
      "Sales, collections, and exceptions land in chats  -  not a dashboard with alerts you can act on.",
    features: [
      {
        title: "Daily owner dashboard",
        detail: "Sales, stock, collections, and pipeline in under 60 seconds.",
      },
      {
        title: "Monthly MIS packs",
        detail: "Structured management reporting your finance team can maintain.",
      },
      {
        title: "AI exception alerts",
        detail:
          "When collections, margins, or KPIs drift  -  flagged before month-end surprises.",
      },
      {
        title: "Sheet-native data",
        detail:
          "No parallel ERP demo  -  numbers flow from how your team works today.",
      },
    ],
    outcomes: [
      "Decisions from today's numbers  -  not week-old phone updates",
      "Finance and ops aligned on one source of truth",
      "Exceptions surfaced before they become fires",
    ],
    ctaLabel: "Scope MIS on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope AI-assisted MIS and owner dashboards for our business.",
    workspaceHref: "/products",
    workspaceCta: "See products",
    featured: true,
    relatedSlugs: ["whatsapp-ai", "flow", "inventory"],
  },
  {
    slug: "hr",
    name: "HR & workforce",
    shortDescription: "Attendance, field teams, leave, payroll-ready data, and hiring.",
    hubBlurb: "Geo check-in, field visits, and hiring in one workspace  -  WhatsApp-ready ops.",
    eyebrow: "Workforce operations",
    title: "HR modules for",
    titleAccent: "Indian MSME teams.",
    lead:
      "Attendance & leave with payroll-ready summaries, field executive tracking as a separate module, and hiring pipelines  -  in the same Sheetomatic workspace as tasks and MIS.",
    problem: "No reliable attendance or leave visibility",
    problemDetail:
      "Field and office attendance live in registers and chats  -  nobody trusts the numbers.",
    features: [
      {
        title: "Attendance & leave",
        detail:
          "Geo-fenced check-in, leave approvals, shift-friendly hours, payroll-ready summaries.",
      },
      {
        title: "Field executive tracking",
        detail:
          "Client geo check-ins, visit notes, and manager visibility  -  separate from office punch.",
      },
      {
        title: "Hiring & documentation",
        detail:
          "Pipeline stages, document checklists, and interview tracking from applied to hired.",
      },
      {
        title: "Per-org enablement",
        detail:
          "Modules switched on after a short scope call  -  aligned to team size and readiness.",
      },
    ],
    outcomes: [
      "Payroll inputs from attendance you can defend",
      "Field team trail without end-of-day WhatsApp summaries",
      "Hiring handoffs documented  -  not lost in email",
    ],
    ctaLabel: "Scope HR modules on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope HR modules  -  attendance, field tracking, and/or hiring for our team.",
    workspaceHref: "/login?callbackUrl=%2Fapp%2Fhr",
    workspaceCta: "Open HR workspace",
    relatedSlugs: ["tasks", "mis"],
  },
  {
    slug: "tasks",
    name: "Tasks & follow-up",
    shortDescription: "Delegated work, due dates, voice capture, and WhatsApp nudges.",
    hubBlurb: "Nothing lives in memory  -  owners, priorities, and AI reminders built in.",
    eyebrow: "Daily execution",
    title: "AI task delegation",
    titleAccent: "that your team actually opens.",
    lead:
      "Capture work by voice or text, assign owners and due dates, and let WhatsApp nudges replace chasing people in personal chats.",
    problem: "Tasks get lost in WhatsApp and memory",
    problemDetail:
      "Follow-ups depend on who remembers to chase  -  not a system with owners, due dates, and AI nudges.",
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
        detail: "Routine follow-ups automated  -  humans step in on exceptions.",
      },
      {
        title: "Workspace-native",
        detail: "Same login as HR and MIS  -  one operating stack.",
      },
    ],
    outcomes: [
      "Managers see overdue work without asking in groups",
      "Delegated tasks linked to customers and orders where needed",
      "Less Monday-morning memory chasing",
    ],
    ctaLabel: "Scope tasks on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope AI task delegation and WhatsApp follow-up for our team.",
    workspaceHref: "/login",
    workspaceCta: "Open workspace",
    relatedSlugs: ["whatsapp-ai", "flow", "hr"],
  },
  {
    slug: "crm",
    name: "AI-powered CRM",
    shortDescription: "Pipeline, leads, and customer records tied to WhatsApp.",
    hubBlurb: "Sales history and stage  -  not buried in personal threads.",
    eyebrow: "Revenue operations",
    title: "CRM connected to",
    titleAccent: "how you already sell.",
    lead:
      "Lead tracking, pipeline stages, and customer records linked to WhatsApp conversations and your team inbox  -  one end-to-end CRM on Google Workspace.",
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
        detail: "Conversations attached to accounts  -  not screenshot archaeology.",
      },
      {
        title: "Team inbox alignment",
        detail: "Handoffs between sales and support without losing context.",
      },
      {
        title: "MIS-ready exports",
        detail: "Pipeline and collections feed owner dashboards automatically.",
      },
    ],
    outcomes: [
      "Forecast from pipeline  -  not gut feel",
      "New reps onboard without inheriting mystery chats",
      "Follow-ups system-driven  -  not owner memory",
    ],
    ctaLabel: "Scope CRM on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope an AI-powered CRM linked to our WhatsApp sales flow.",
    workspaceHref: "/ai",
    workspaceCta: "Explore Sheetomatic AI",
    relatedSlugs: ["whatsapp-ai", "mis"],
  },
  {
    slug: "inventory",
    name: "Inventory",
    shortDescription: "Stock in/out, locations, and reorder signals tied to daily ops.",
    hubBlurb: "Registers that match sales and purchases  -  with alerts before stockouts.",
    eyebrow: "Stock control",
    title: "Inventory that",
    titleAccent: "matches how you sell and buy.",
    lead:
      "End-to-end stock movements, locations, reorder signals, and alerts  -  tied to the same sheets and workflows your team uses every day.",
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
        detail: "Stock exceptions surface in the same MIS owners already open.",
      },
    ],
    outcomes: [
      "Purchasing decisions from current stock  -  not last month's guess",
      "Fewer emergency runs and dead stock surprises",
      "Finance and warehouse aligned on one number",
    ],
    ctaLabel: "Scope inventory on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope inventory management connected to our daily sales and purchase flow.",
    workspaceHref: "/products",
    workspaceCta: "See products",
    relatedSlugs: ["mis", "flow"],
  },
  {
    slug: "flow",
    name: "Flow monitoring",
    shortDescription: "Enquiry to dispatch, payment, and closure with stage owners.",
    hubBlurb: "See where orders stall  -  with AI nudges when a step sits too long.",
    eyebrow: "Order visibility",
    title: "Flow monitoring from",
    titleAccent: "enquiry to closure.",
    lead:
      "Stage-based visibility with named owners and automatic nudges when work stalls  -  enquiry, dispatch, payment, and delivery on one trail.",
    problem: "Orders stall between enquiry and closure",
    problemDetail:
      "Nobody sees where an order stuck  -  enquiry, dispatch, payment, or delivery.",
    features: [
      {
        title: "Stage-based boards",
        detail: "Every order shows current step, owner, and age.",
      },
      {
        title: "Stall detection",
        detail: "AI nudges when a step exceeds your SLA  -  before the customer calls.",
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
      "Owners see bottlenecks by stage  -  not anecdotes",
      "Customer updates without manual copy-paste",
    ],
    ctaLabel: "Scope flow monitoring on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope flow monitoring from enquiry through dispatch and payment.",
    relatedSlugs: ["tasks", "mis", "whatsapp-ai"],
  },
  {
    slug: "automation",
    name: "Workflow automation",
    shortDescription: "Sheets, WhatsApp, workspace, and AI  -  repetitive work removed.",
    hubBlurb: "Reports, approvals, and reminders rebuilt automatically every day.",
    eyebrow: "Efficiency",
    title: "Workflow automation",
    titleAccent: "across your stack.",
    lead:
      "End-to-end automations across Google Sheets, WhatsApp, Sheetomatic workspace, and AI  -  replacing manual reporting, approvals, and follow-up loops.",
    problem: "Manual copy-paste eats the week",
    problemDetail:
      "Reports, approvals, and reminders are rebuilt by hand every day.",
    features: [
      {
        title: "Sheet workflows",
        detail: "Formulas, triggers, and recurring reports maintained by your team.",
      },
      {
        title: "Cross-system triggers",
        detail: "WhatsApp, workspace tasks, and dashboards wired as one flow.",
      },
      {
        title: "Approval chains",
        detail: "Leave, expenses, and discounts routed with audit trail.",
      },
      {
        title: "AI-assisted maintenance",
        detail: "Prompt and rule tuning post go-live  -  not a one-time install.",
      },
    ],
    outcomes: [
      "Hours back every week on reporting",
      "Fewer version conflicts between parallel sheets",
      "Automations your team can explain  -  not black boxes",
    ],
    ctaLabel: "Scope automation on WhatsApp",
    whatsappMessage:
      "Hi Sheetomatic, I want to scope workflow automation across Sheets, WhatsApp, and our workspace.",
    relatedSlugs: ["mis", "tasks"],
  },
];

export const serviceCategoryBySlug = Object.fromEntries(
  serviceCategories.map((c) => [c.slug, c]),
) as Record<ServiceCategorySlug, ServiceCategory>;

export function isServiceCategorySlug(
  slug: string,
): slug is ServiceCategorySlug {
  return slug in serviceCategoryBySlug;
}
