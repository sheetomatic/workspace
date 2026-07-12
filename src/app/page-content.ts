import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import { whatsappDisplayNumber, whatsappTel } from "./site-content";

export const knowledgeTransferLinks = {
  flowMonitoring: "/courses#topic-flow-monitoring",
  dashboards: "/courses#topic-dashboards",
  whatsapp: "/courses#topic-whatsapp",
} as const;

export const mainNav = [
  { href: "/services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/courses", label: "Courses" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const footerCompanyLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/career", label: "Careers" },
  { href: "/courses", label: "Courses" },
  { href: "/terms", label: "Terms" },
];

export const footerProductLinks = [
  { href: "/products", label: "BCI Suite" },
  { href: WORKSPACE_LOGIN_HREF, label: "Sheetomatic Workspace" },
  { href: "/ai", label: "Sheetomatic AI" },
  { href: "/whatsapp-plans", label: "WhatsApp API" },
  { href: "/services/flow", label: "FMS" },
  { href: "/services/inventory", label: "IMS" },
  { href: "/services/checklist", label: "Checklist (PC Module)" },
  { href: "/services/tasks", label: "Tasks (EA Module)" },
  { href: "/services/mis", label: "Executive Meeting" },
  { href: "/services/automation", label: "Custom Software" },
];

/** Services hub industry cards — each links to a relevant module, not generic anchors */
export const servicesIndustryCards = [
  { href: "/services/flow", label: "Manufacturing" },
  { href: "/services/inventory", label: "Distribution" },
  { href: "/services/checklist", label: "Services" },
  { href: "/services/flow", label: "Trading" },
  { href: "/services/tasks", label: "Job work" },
  { href: "/services/whatsapp-ai", label: "Ecommerce" },
  { href: "/services/whatsapp-ai", label: "Real Estate" },
  { href: "/services/mis", label: "Healthcare" },
];

export const homePainHook = {
  eyebrow: "Tired of Google Sheets & AppSheet limitations?",
  title: "Your ops deserve more than spreadsheet patches and storage limits.",
  lead:
    "When row caps, broken AppSheet automations, and data trapped in personal Drive slow your team down, it is time for a real workspace — not another tab in someone's Google account.",
  pains: [
    {
      title: "Google Sheets & AppSheet limits",
      text: "Automations break at scale. Permissions sprawl. Nobody owns the master file.",
    },
    {
      title: "Data storage & ownership risk",
      text: "Stock, sales, and collections live in personal Drive — gone when staff change.",
    },
  ],
} as const;

export const clientProblems = {
  eyebrow: "The problem",
  title: "Google Sheets, AppSheet, and WhatsApp were never meant to run a business.",
  lead:
    "Most MSMEs lose margin in the same places — spreadsheet limits, scattered storage, delayed reporting, and conversations that never become action.",
  items: [
    {
      title: "Google Sheets & AppSheet hit their ceiling fast",
      text: "Row limits, fragile automations, and version conflicts — ops slow down exactly when you need to scale.",
    },
    {
      title: "Data storage lives in the wrong place",
      text: "Critical numbers sit in personal Gmail and Drive folders. Access breaks when people leave. Nothing is audit-ready.",
    },
    {
      title: "Operations live in spreadsheets nobody trusts",
      text: "Sales, stock, and collections sit in files with different formats. No one sees one version of the truth.",
    },
    {
      title: "MIS depends on experts you cannot keep",
      text: "Weekly reports take days. Quality varies. Owners wait on analysts instead of acting on Monday numbers.",
    },
    {
      title: "WhatsApp is your CRM — and your chaos",
      text: "Leads, follow-ups, and customer history scatter across personal chats. Nothing rolls up to management.",
    },
    {
      title: "Managers chase updates instead of fixing leaks",
      text: "Tasks, checklists, and flow stages stall because reminders live in memory, not a system.",
    },
    {
      title: "Heavy ERP is overkill and under-used",
      text: "Big software bills, low adoption, and teams still fall back to informal messages and manual files.",
    },
    {
      title: "No weekly executive view without manual assembly",
      text: "Executive Meeting boards require copy-paste every Sunday. Monday starts late — before decisions even begin.",
    },
  ],
  resolution:
    "Sheetomatic Workspace replaces spreadsheet chaos with FMS, IMS, Checklist and Tasks modules — Process Coordinator and Executive Assistant roles monitor through their portals — plus Executive Meeting (Weekly) ready every Monday, exceptions only, without building a MIS team.",
};

export const servicesPage = {
  eyebrow: "For running MSMEs",
  title: "Operating systems that protect",
  titleAccent: "margin — not another fire drill.",
  lead:
    "Built for owner-led businesses with revenue and a team — not startup experiments. We Build your workspace, Manage adoption until portals run daily, and Scale modules as leaks close. Monday numbers land without you in every task.",
  heroStats: [
    {
      value: "Mon",
      headline: "Monday numbers you act on",
      label:
        "Executive Meeting (Weekly) assembles person-wise deficit and overdue flow — exceptions only, zero Sunday MIS prep.",
      featured: true,
      accent: "sky",
    },
    {
      value: "PC+EA",
      headline: "Accountability without you chasing",
      label:
        "Checklist module scores via the Process Coordinator role. Tasks module scores via the Executive Assistant role. Your team runs the rhythm - you review the board.",
      accent: "amber",
    },
    {
      value: "BMS",
      headline: "Build. Manage. Scale.",
      label:
        "One system replaces spreadsheet patches and WhatsApp follow-ups — perceived value in margin saved, not software price.",
      accent: "emerald",
    },
  ],
  audienceLabel: "Trusted by owners in",
  ownerGlance: {
    eyebrow: "What we deliver",
    items: [
      {
        tag: "FMS",
        headline: "Flow monitoring end to end",
        detail:
          "Enquiry to dispatch, payment, and closure — stage owners, proofs, and nudges when work stalls.",
      },
      {
        tag: "IMS",
        headline: "Inventory you can trust",
        detail:
          "Stock in/out, locations, reorder signals, and alerts tied to the same flow your team runs daily.",
      },
      {
        tag: "PC",
        headline: "Checklist module (PC role)",
        detail:
          "Recurring checklists with owners, due dates, and completion scoring - Process Coordinator role monitors standards every shift via the PC portal.",
      },
      {
        tag: "AI",
        headline: "WhatsApp AI & CRM inbox",
        detail:
          "Official WhatsApp Business API, AI chatbot, lead capture, and human handoff in Sheetomatic AI.",
      },
    ],
    footnote:
      "Workspace SaaS plus Sheetomatic AI — scoped, configured, and supported by one team.",
  },
  audienceTags: [
    "Manufacturing",
    "Distribution",
    "Services",
    "Trading",
    "Job work",
  ],
  painSection: {
    eyebrow: "Firefighting costs margin",
    title: "Six leaks owners fix with systems, not more chasing",
    lead:
      "If two or more match your week, you are the right customer — a running MSME, not a slide-deck startup.",
    pullQuote:
      "Price is what you pay. Perceived value is margin protected every Monday — without you in every WhatsApp thread.",
  },
  resolutionHeadline: "Build the system. Manage adoption. Scale what works.",
  resolutionSub:
    "FMS, IMS, Checklist and Tasks modules, and Executive Meeting (Weekly) in one workspace — Process Coordinator and Executive Assistant roles hold the team accountable through their portals while you manage from the board.",
  resolutionPillars: [
    { label: "Build", text: "Map leaks and wire modules to how your team already works" },
    { label: "Manage", text: "Portals live until Checklist and Tasks module scores run without owner chasing" },
    { label: "Scale", text: "Add IMS, AI, and custom modules as the first win sticks" },
  ],
  industriesTitle: "Running MSMEs across India",
  industriesLead:
    "Manufacturing, distribution, trading, and services with real payroll — one workspace, not another pilot that never sticks.",
  processTitle: "Build. Manage. Scale.",
  processLead:
    "Systems beat firefighting — we stay through adoption, not hand you a login and leave.",
  processCtaLead:
    "Share where margin leaks today — flow stalls, stock drift, or Monday numbers you cannot trust. We map the first system win.",
  processSteps: [
    {
      step: "01",
      title: "Build",
      text: "Trace margin leaks in flow, stock, checklists, and follow-ups — then wire FMS, IMS, Checklist and Tasks modules, and Executive Meeting to your process.",
    },
    {
      step: "02",
      title: "Manage",
      text: "Train Process Coordinator and Executive Assistant roles on the Checklist and Tasks modules until daily discipline runs without you chasing WhatsApp — Sheetomatic AI connected throughout.",
    },
    {
      step: "03",
      title: "Scale",
      text: "Expand modules, tune AI, and tighten the Monday board until exceptions only — team accountability without owner in every task.",
    },
  ],
  problemSolutionTitle: "Leaks closed with systems",
  problemSolutionLead:
    "FMS, IMS, and Executive Meeting are running systems — Checklist and Tasks modules empower Process Coordinator and Executive Assistant roles to monitor performance through their portals so you manage the board, not every task.",
};

export type ServiceProblemSolution = {
  problem: string;
  problemDetail: string;
  solution: string;
  solutionDetail: string;
  href: string;
  cta: string;
};

export const serviceProblemSolutions: ServiceProblemSolution[] = [
  {
    problem: "Orders stall between enquiry and closure",
    problemDetail:
      "Nobody sees where work stuck — enquiry, dispatch, payment, or delivery — until someone asks on WhatsApp.",
    solution: "FMS — Flow Monitoring",
    solutionDetail:
      "Stage-based visibility with named owners, proofs, and automatic nudges when a step sits too long.",
    href: "/services/flow",
    cta: "Explore FMS",
  },
  {
    problem: "Stock on paper does not match reality",
    problemDetail:
      "Inventory registers drift from sales and purchases. Reorders are guesswork.",
    solution: "IMS — Inventory Management",
    solutionDetail:
      "Stock in/out, locations, reorder signals, and alerts — tied to the same flow data your team uses daily.",
    href: "/services/inventory",
    cta: "Explore IMS",
  },
  {
    problem: "Recurring ops slip without accountability",
    problemDetail:
      "Daily and weekly checklists depend on who remembers — not scored completion via the Checklist module and Process Coordinator role.",
    solution: "Process Coordinator",
    solutionDetail:
      "Checklist module with recurring SOPs, owners, due dates, and mobile completion — Process Coordinator role scores via the PC portal; standards monitored, not remembered.",
    href: "/services/checklist",
    cta: "Explore Process Coordinator",
  },
  {
    problem: "Tasks get lost in WhatsApp and memory",
    problemDetail:
      "Executive Assistants chase follow-ups manually — no Tasks module with owners, due dates, and scored delivery.",
    solution: "Executive Assistant",
    solutionDetail:
      "Tasks module for delegation with priorities and proof — Executive Assistant role scores via the EA portal; follow-through monitored, not chased on WhatsApp.",
    href: "/services/tasks",
    cta: "Explore Executive Assistant",
  },
  {
    problem: "Monday starts without a trusted executive view",
    problemDetail:
      "Executive Meeting boards are rebuilt by hand every Sunday. Owners wait on MIS instead of acting on numbers.",
    solution: "Executive Meeting (Weekly)",
    solutionDetail:
      "Weekly board assembled automatically — person-wise deficit, overdue flow, and team scores. Open Monday, exceptions only.",
    href: "/services/mis",
    cta: "Explore Executive Meeting",
  },
  {
    problem: "Night-time WhatsApp leads go unanswered",
    problemDetail:
      "Customers message after hours. Your team replies late — or not at all.",
    solution: "WhatsApp AI chatbot",
    solutionDetail:
      "AI replies, qualification, order updates, CRM inbox, and human handoff — official WhatsApp Business API.",
    href: "/services/whatsapp-ai",
    cta: "Explore WhatsApp AI",
  },
  {
    problem: "Your process does not fit off-the-shelf modules",
    problemDetail:
      "Generic ERP and template apps miss how your team actually works. You need something built for your industry.",
    solution: "Custom Software",
    solutionDetail:
      "Industry-specific modules, integrations, and workflows — scoped, built, and run on Sheetomatic Workspace.",
    href: "/services/automation",
    cta: "Explore Custom Software",
  },
];

export const serviceDeliverables = [
  {
    title: "FMS — Flow Monitoring",
    tag: "Pipeline",
    text: "Stage-based order and job flow from enquiry to closure with owners, proofs, and stall alerts.",
    outcome: "Everyone sees where work stuck — before margin leaks.",
    featured: true,
  },
  {
    title: "IMS — Inventory Management",
    tag: "Stock",
    text: "Stock in/out, locations, reorder signals, and alerts connected to live flow data.",
    outcome: "Inventory matches reality — not last week's register.",
  },
  {
    title: "Process Coordinator",
    tag: "Operations",
    text: "Checklist module with mobile completion — Process Coordinator role scores via the PC portal and monitors standards every shift.",
    outcome: "Daily ops run on schedule — scored, not remembered.",
  },
  {
    title: "Executive Assistant",
    tag: "Follow-up",
    text: "Tasks module with due dates and proof of completion — Executive Assistant role scores via the EA portal and monitors follow-through.",
    outcome: "Follow-ups land on time — without chasing on WhatsApp.",
  },
  {
    title: "Executive Meeting (Weekly)",
    tag: "Executive",
    text: "Weekly board assembled automatically — person-wise deficit, overdue flow, and team scores. Open Monday, exceptions only.",
    outcome: "Monday starts with numbers you trust — no MIS assembly.",
    featured: true,
  },
  {
    title: "Sheetomatic AI",
    tag: "Conversations",
    text: "WhatsApp Business API, AI chatbot, CRM inbox, and team handoff for customer conversations.",
    outcome: "Leads captured and followed up — day and night.",
  },
  {
    title: "Custom Software",
    tag: "Your process",
    text: "Industry-specific modules, integrations, and workflows built on Sheetomatic Workspace when standard modules are not enough.",
    outcome: "Software shaped around your operation — scoped and supported by Sheetomatic.",
  },
];

export const productCategories = [
  {
    name: "FMS — Flow Monitoring",
    text: "Stop orders dying in the middle — stage owners and stall alerts protect margin from enquiry to closure.",
  },
  {
    name: "IMS — Inventory Management",
    text: "Stock that matches sales and purchases — reorder before stockouts eat margin, not after the fire drill.",
  },
  {
    name: "Process Coordinator",
    text: "Shift standards run on the Checklist module — Process Coordinator role scores via the PC portal so managers coach from data, not your memory.",
  },
  {
    name: "Executive Assistant",
    text: "Tasks module with owners, due dates, and proof — Executive Assistant role monitors follow-through via the EA portal so you are not in every WhatsApp chase.",
  },
  {
    name: "Executive Meeting (Weekly)",
    text: "Monday numbers you trust — person-wise deficit and team scores assembled automatically, exceptions only.",
    featured: true,
  },
  {
    name: "WhatsApp AI chatbot",
    text: "Night leads qualified and handed to owned tasks — conversations become action, not owner firefighting.",
  },
  {
    name: "Sheetomatic AI CRM",
    text: "Pipeline and customer history tied to WhatsApp — one record per account, not scattered personal chats.",
  },
  {
    name: "Sheetomatic Workspace",
    text: "One login for running MSMEs — FMS, IMS, Checklist, Tasks, Executive Meeting, and AI modules; Process Coordinator and Executive Assistant roles run daily through their portals.",
  },
  {
    name: "Custom Software",
    text: "When standard modules miss your process — built on the same workspace, scaled after the first system win sticks.",
  },
];

export const productsPage = {
  eyebrow: "Operating systems, not apps",
  title: "Modules that protect margin while your team runs without you.",
  lead:
    "For owner-led MSMEs with revenue and payroll — FMS, IMS, Checklist and Tasks modules, Executive Meeting (Weekly), and Sheetomatic AI, with Process Coordinator and Executive Assistant roles on their portals. Perceived value in Monday numbers and closed leaks, not shelf price.",
};

export const contactPage = {
  eyebrow: "Contact",
  title: "Speak with Sheetomatic.",
  lead: "Message us on WhatsApp. We respond quickly for active projects and new enquiries.",
};

export const contactDetails = {
  whatsappNumber: whatsappDisplayNumber,
  whatsappTel,
  website: "sheetomatic.com",
  websiteUrl: "https://sheetomatic.com",
};

export const socialLinks = [
  {
    name: "LinkedIn" as const,
    label: "Sheetomatic on LinkedIn",
    href: "https://www.linkedin.com/in/sheetomatic/",
  },
  {
    name: "Facebook" as const,
    label: "Sheetomatic on Facebook",
    href: "https://www.facebook.com/sheetomaticofficial",
  },
  {
    name: "Instagram" as const,
    label: "Sheetomatic on Instagram",
    href: "https://www.instagram.com/sheetomatic/",
  },
  {
    name: "X" as const,
    label: "Sheetomatic on X",
    href: "https://x.com/sheetomatic",
  },
];

export const aboutPage = {
  eyebrow: "About",
  title: "Built for operators, not slide decks.",
  lead:
    "Sheetomatic builds Workspace SaaS and Sheetomatic AI for Indian MSMEs — founded by Shyam Kumar Banjare.",
};

export const careerPage = {
  eyebrow: "Career",
  title: "Join the Sheetomatic team.",
  lead:
    "We hire for operations, AI, and client success roles — remote or at client sites when the placement requires it.",
};

/** @deprecated Prefer `@/app/courses-content` — kept for any legacy imports */
export {
  coursesPage,
  coursePhases,
  courseFormatBullets,
  coursesWhatsAppUrl,
} from "./courses-content";

/** Anchor targets still used by knowledgeTransferLinks */
export const freeCourseTopics = [
  {
    id: "topic-flow-monitoring",
    title: "Flow Monitoring Systems",
    text: "How work moves from enquiry to dispatch, payment, and closure with visible status and owners.",
    href: "https://youtu.be/PM8E3mCw67Q",
    tag: "Flow Monitoring",
  },
  {
    id: "topic-whatsapp",
    title: "WhatsApp Automations",
    text: "Connect WhatsApp workflows with reminders and follow-ups for MSME teams.",
    href: "https://youtu.be/wOdr9JT4oM8",
    tag: "WhatsApp",
  },
  {
    id: "topic-dashboards",
    title: "Executive dashboards",
    text: "Build owner-level dashboards for daily control and weekly executive meeting reporting.",
    href: "https://youtu.be/QrgmCt-LIYA",
    tag: "Dashboards",
  },
];
