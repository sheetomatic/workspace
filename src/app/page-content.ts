import { whatsappDisplayNumber, whatsappTel } from "./site-content";

export const knowledgeTransferLinks = {
  flowMonitoring: "/courses#topic-flow-monitoring",
  dashboards: "/courses#topic-dashboards",
  appsheet: "/courses#topic-appsheet",
  whatsapp: "/courses#topic-whatsapp",
} as const;

export const mainNav = [
  { href: "/services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const footerCompanyLinks = [
  { href: "/services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/career", label: "Careers" },
  { href: "/contact", label: "Contact" },
];

export const footerProductLinks = [
  { href: "/ai", label: "Sheetomatic AI" },
  { href: "/products", label: "Workspace products" },
  { href: "/courses", label: "Courses & training" },
  { href: "/ai#features", label: "AI features" },
  { href: "/ai/pricing", label: "AI pricing" },
];

export const footerIndustryLinks = [
  { href: "/ai#features", label: "Ecommerce" },
  { href: "/ai#features", label: "Real Estate" },
  { href: "/ai#features", label: "Healthcare" },
  { href: "/ai#features", label: "Travel" },
  { href: "/ai#features", label: "Education" },
  { href: "/ai#features", label: "SaaS" },
  { href: "/ai#features", label: "Logistics" },
];

export const homeQuickLinks = [
  {
    href: "/login",
    label: "Workspace",
    description:
      "Sign in to your client dashboard for tasks, reports, approvals, and team control.",
  },
  {
    href: "/ai",
    label: "Sheetomatic AI",
    description:
      "WhatsApp AI chatbot, team inbox, CRM, and automation for customer conversations.",
  },
  {
    href: "/services",
    label: "Services",
    description: "End-to-end AI-powered solutions on Google Workspace and WhatsApp.",
  },
  {
    href: "/products",
    label: "Products",
    description:
      "CRM, attendance, inventory, task systems, and custom apps on Google Workspace.",
  },
  {
    href: "/courses",
    label: "Courses",
    description:
      "Free YouTube playlists and paid programs on Sheets, AppSheet, and automation.",
  },
  {
    href: "/about",
    label: "About",
    description: "Founder-led consultancy for Indian MSME operations.",
  },
  {
    href: "/career",
    label: "Careers",
    description:
      "Join the Sheetomatic payroll bench - MIS, AI tools, WhatsApp automation, and Google Workspace roles.",
  },
  {
    href: "/contact",
    label: "Contact",
    description: "WhatsApp us for MIS, automation, and AI workflows.",
  },
] as const;

export const homePage = {
  eyebrow: "Automation and AI Consultancy",
  title: "Operational control for Indian MSMEs.",
  lead:
    "Client workspaces, Google Workspace systems, and WhatsApp automation - built for owners who need clarity, not complexity.",
};

export const clientProblems = {
  eyebrow: "The problem",
  title: "Most MSMEs run on chaos, not systems.",
  lead:
    "Before we implement anything, we align on what is breaking today - usually the same patterns across manufacturing, distribution, and services.",
  items: [
    {
      title: "Data lives in WhatsApp and scattered sheets",
      text: "Sales, stock, collections, and follow-ups sit in personal chats and files. No one sees the full picture.",
    },
    {
      title: "Owners chase updates manually",
      text: "Managers report late. MIS takes days. Decisions wait on phone calls instead of daily numbers.",
    },
    {
      title: "Heavy ERP is overkill and under-used",
      text: "Big software bills, low adoption, and teams still fall back to Excel and informal messages.",
    },
    {
      title: "MIS talent is hard to hire and retain",
      text: "Full payroll, office, and tools on your books - while reporting quality still varies week to week.",
    },
    {
      title: "Customer follow-up is inconsistent",
      text: "Leads, payments, and service requests slip when reminders depend on individual memory.",
    },
    {
      title: "No single workspace for the business",
      text: "Each department uses its own format. Owners cannot log in once and see tasks, MIS, and exceptions.",
    },
  ],
  resolution:
    "Sheetomatic designs practical systems on Google Workspace and client workspaces, scoped on a consultation call, then delivered with adoption support.",
};

export const servicesPage = {
  eyebrow: "AI-powered operations",
  title: "End-to-end systems for",
  titleAccent: "sales, stock, cash, and customer conversations.",
  lead:
    "One consultation to scope it. We design, build, integrate, train, and support - with AI in WhatsApp, reporting, and daily follow-up from day one.",
  heroStats: [
    {
      value: "AI",
      headline: "Intelligence built in",
      label:
        "WhatsApp AI, smart reminders, and assisted reporting - part of the system, not a bolt-on.",
      featured: true,
      accent: "sky",
    },
    {
      value: "E2E",
      headline: "End-to-end delivery",
      label:
        "Discovery through go-live, integration, and training - one team owns the full solution.",
      accent: "amber",
    },
    {
      value: "Daily",
      headline: "Runs every day",
      label:
        "We stay until managers use it daily and AI handles the routine follow-ups reliably.",
      accent: "emerald",
    },
  ],
  audienceLabel: "Trusted by owners in",
  ownerGlance: {
    eyebrow: "What we deliver",
    items: [
      {
        tag: "AI",
        headline: "WhatsApp & chat automation",
        detail:
          "AI replies, lead qualification, team inbox, and human handoff on official WhatsApp API.",
      },
      {
        tag: "MIS",
        headline: "Reporting owners trust",
        detail:
          "Daily dashboards and monthly MIS with AI-assisted alerts when numbers or collections drift.",
      },
      {
        tag: "Flow",
        headline: "Order visibility end to end",
        detail:
          "Enquiry to dispatch, payment, and closure - with stage owners and automatic nudges when work stalls.",
      },
      {
        tag: "Ops",
        headline: "Tasks & follow-up on autopilot",
        detail:
          "Delegated work, due dates, voice capture, and WhatsApp reminders so nothing lives in memory.",
      },
    ],
    footnote:
      "Full-stack delivery on one call - scoped, built, integrated, and supported by Sheetomatic.",
  },
  audienceTags: [
    "Manufacturing",
    "Distribution",
    "Services",
    "Trading",
    "Job work",
  ],
  painSection: {
    eyebrow: "Sound familiar?",
    title: "Six leaks draining margin every week",
    lead:
      "If two or more sound like your Monday morning, you are exactly who we build for.",
    pullQuote:
      "You do not need another ERP demo. You need one place where flow, stock, tasks, and MIS stay current.",
  },
  resolutionHeadline: "One call. One blueprint. Systems people actually open.",
  resolutionSub:
    "We map flow, stock, tasks, and reporting on Google Workspace and client workspaces - then stay until managers and staff use it daily.",
  resolutionPillars: [
    { label: "Discover", text: "Trace where data and follow-ups break today" },
    { label: "Build", text: "End-to-end on Sheets, dashboards, WhatsApp & AI" },
    { label: "Adopt", text: "Train and tune until owners trust the numbers" },
  ],
  industriesTitle: "Sectors we serve across India",
  industriesLead:
    "Owner-led MSMEs in these industries run WhatsApp AI, MIS, and workspace ops from one Sheetomatic stack.",
  processTitle: "End to end. Three phases.",
  processLead:
    "One partner from discovery to daily use - with AI wired in throughout, not added later.",
  processCtaLead:
    "Tell us where attendance, field teams, or follow-ups break today - we will map the first win on WhatsApp.",
  processSteps: [
    {
      step: "01",
      title: "Discover & scope",
      text: "We map leaks in WhatsApp, sheets, follow-ups, stock, and owner visibility - and define the full solution on one call.",
    },
    {
      step: "02",
      title: "Build & integrate",
      text: "Sheets, Looker Studio, WhatsApp API, Sheetomatic AI, and your workspace - connected as one end-to-end system.",
    },
    {
      step: "03",
      title: "Go live & tune AI",
      text: "Team training, AI prompt tuning, post go-live fixes, and support until the stack runs every day without you chasing.",
    },
  ],
  problemSolutionTitle: "Problems we fix - end to end",
  problemSolutionLead:
    "Each solution is scoped, built, integrated, and supported by Sheetomatic - with AI handling routine conversations and follow-ups throughout.",
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
    problem: "Tasks get lost in WhatsApp and memory",
    problemDetail:
      "Follow-ups depend on who remembers to chase - not a system with owners, due dates, and AI nudges.",
    solution: "AI task delegation",
    solutionDetail:
      "End-to-end task system with voice/text capture, smart assignment, priorities, and WhatsApp reminders from your workspace.",
    href: "/services/tasks",
    cta: "Explore tasks service",
  },
  {
    problem: "No reliable attendance or leave visibility",
    problemDetail:
      "Field and office attendance live in registers and chats - nobody trusts the numbers.",
    solution: "Attendance & leave system",
    solutionDetail:
      "Geo-fenced check-in, leave approvals, payroll-ready attendance, and facial recognition policy - in Sheetomatic workspace.",
    href: "/services/hr/attendance-leave",
    cta: "View attendance module",
  },
  {
    problem: "Field teams are invisible until end of day",
    problemDetail:
      "Sales and service executives check in on WhatsApp - no map, no client trail, no MIS.",
    solution: "Field executive tracking",
    solutionDetail:
      "Separate module for client geo check-ins, visit plans, and manager dashboards - not mixed with office punch.",
    href: "/services/hr/field-tracking",
    cta: "View field tracking",
  },
  {
    problem: "Leads and customers scattered across chats",
    problemDetail:
      "Sales history and pipeline stage are buried in personal WhatsApp threads.",
    solution: "AI-powered CRM",
    solutionDetail:
      "Lead tracking, pipeline, and customer records linked to WhatsApp conversations and team inbox - one end-to-end CRM.",
    href: "/services/crm",
    cta: "Explore CRM service",
  },
  {
    problem: "Night-time WhatsApp leads go unanswered",
    problemDetail:
      "Customers message after hours. Your team replies late - or not at all.",
    solution: "WhatsApp AI chatbot",
    solutionDetail:
      "AI replies, qualification, order updates, team inbox, and human handoff - official API, built and tuned for your business.",
    href: "/services/whatsapp-ai",
    cta: "Explore WhatsApp AI",
  },
  {
    problem: "Owner numbers arrive too late to act",
    problemDetail:
      "Sales, collections, and exceptions land in chats - not a dashboard with alerts you can act on.",
    solution: "AI-assisted MIS",
    solutionDetail:
      "Daily dashboards, monthly MIS, and Looker views with AI-flagged exceptions when collections or KPIs drift.",
    href: "/services/mis",
    cta: "Explore MIS service",
  },
  {
    problem: "Stock on paper does not match reality",
    problemDetail:
      "Inventory registers drift from sales and purchases. Reorders are guesswork.",
    solution: "Inventory management",
    solutionDetail:
      "End-to-end stock in/out, locations, reorder signals, and alerts - tied to the same data your team uses daily.",
    href: "/services/inventory",
    cta: "Explore inventory service",
  },
  {
    problem: "Orders stall between enquiry and closure",
    problemDetail:
      "Nobody sees where an order stuck - enquiry, dispatch, payment, or delivery.",
    solution: "Flow monitoring",
    solutionDetail:
      "Stage-based visibility with named owners and AI nudges when a step sits too long - enquiry to closure.",
    href: "/services/flow",
    cta: "Explore flow service",
  },
  {
    problem: "Manual copy-paste eats the week",
    problemDetail:
      "Reports, approvals, and reminders are rebuilt by hand every day.",
    solution: "Workflow automation",
    solutionDetail:
      "End-to-end automations across Sheets, WhatsApp, workspace, and AI - replacing repetitive reporting and follow-up.",
    href: "/services/automation",
    cta: "Explore automation service",
  },
];

export const serviceDeliverables = [
  {
    title: "MIS & reporting",
    tag: "Owner view",
    text: "Monthly MIS, data cleanup, owner dashboards, and management reporting your team can maintain.",
    outcome: "Decisions from daily numbers - not week-old phone updates.",
    featured: true,
  },
  {
    title: "Google Sheets & automation",
    tag: "Automation",
    text: "Formulas, workflows, recurring reports, and AI-assisted integrations that replace manual copy-paste.",
    outcome: "Hours back every week on reporting and follow-ups.",
  },
  {
    title: "Business apps & workflows",
    tag: "End-to-end",
    text: "CRM, inventory, attendance, field ops, and task systems - designed, built, and supported as one stack.",
    outcome: "Field and office on one system - no parallel registers.",
  },
  {
    title: "Looker Studio dashboards",
    tag: "Daily control",
    text: "Sales, stock, collections, and KPI views connected to live sheet data.",
    outcome: "Owner dashboard readable in under 60 seconds.",
  },
  {
    title: "WhatsApp API & workflows",
    tag: "Follow-up",
    text: "Official API, templates, team inbox, and integrations with your operating stack.",
    outcome: "Leads and payments chased with system reminders - not memory.",
  },
  {
    title: "Implementation support",
    tag: "After go-live",
    text: "Discovery, build, training, and ongoing fixes when reality hits the process.",
    outcome: "Systems that survive staff turnover and busy season.",
  },
];

export const productCategories = [
  {
    name: "CRM",
    text: "Lead tracking, follow-ups, customer records, and sales pipeline on Google Workspace.",
  },
  {
    name: "Employee Attendance & Leave App",
    text: "Attendance, leave, geo-fencing, and HR visibility for field and office teams.",
  },
  {
    name: "Field Executive Apps",
    text: "Visit logs, orders, collections, and site reporting from mobile - synced to central sheets.",
  },
  {
    name: "Inventory Management Systems",
    text: "Stock in/out, locations, reorder signals, and ties to sales and purchase data.",
  },
  {
    name: "WhatsApp API",
    text: "Official WhatsApp Business API setup, templates, webhooks, and team inbox integrations.",
  },
  {
    name: "WhatsApp AI Chatbot",
    text: "AI replies, lead capture, and handoff to your team inside WhatsApp conversations.",
  },
  {
    name: "Fully AI Powered Task Delegation Systems",
    text: "Assign, proof-check, and verify tasks with AI-assisted delegation and manager workflows.",
  },
  {
    name: "Fully AI Powered FMS (Flow Monitoring Systems) Creation",
    text: "Design and deploy flow monitoring pipelines with stops, proofs, and live pipeline dashboards.",
  },
  {
    name: "Checklist",
    text: "Recurring operational checklists with owners, due dates, and completion tracking on mobile.",
  },
  {
    name: "Custom ERP & Software",
    text: "Custom apps, ERP layers, internal tools, and industry-specific software on Sheets and AppSheet.",
    featured: true,
  },
];

export const productsPage = {
  eyebrow: "Products",
  title: "Business systems you can run daily.",
  lead:
    "Ready-made and custom-built products on Google Workspace. Discuss scope on a call - we match the right app to your operation.",
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
    "Sheetomatic is an Automation and AI Consultancy for Indian MSMEs - founded by Shyam Kumar Banjare.",
};

export const careerPage = {
  eyebrow: "Career",
  title: "Join the Sheetomatic AI + MIS bench.",
  lead:
    "We hire on Sheetomatic Payroll for MIS, Google Workspace, AI tools, and WhatsApp automation roles - off-site or at client office when the placement requires it.",
};

export const coursesPage = {
  eyebrow: "Knowledge Transfer",
  title: "Learn automation on your schedule.",
  lead:
    "Free playlists on Sheetomatic Videos (YouTube) or paid programs on the Sheetomatic store - practical Google Workspace skills for owners, managers, and teams.",
  freeTitle: "Free video library",
  freeLead:
    "Sheetomatic Videos on YouTube - open any playlist below. Flow Monitoring Systems, Sheets, AppSheet, Forms, Looker Studio, Query, and more.",
  paidTitle: "Paid programs",
  paidLead:
    "Structured programs on the Sheetomatic learning store - enroll after you choose a program.",
  paidStoreButtonLabel: "View paid programs on store",
  watchYoutubeLabel: "Watch on YouTube",
};

export const freeCourseTopics = [
  {
    id: "topic-flow-monitoring",
    title: "Flow Monitoring Systems",
    text: "How work moves from enquiry to dispatch, payment, and closure with visible status and owners.",
    href: "https://youtu.be/bXYleWCg200",
    tag: "Flow Monitoring",
  },
  {
    id: "topic-sheets",
    title: "Google Sheets Premium Course",
    text: "Beginner to advanced Sheets for business reporting, formulas, and daily operations.",
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AFx1xrNMG2UATSLe0ebTtgI",
    tag: "Sheets",
  },
  {
    id: "topic-whatsapp",
    title: "WhatsApp Automations",
    text: "Connect WhatsApp workflows with sheets, reminders, and follow-ups for MSME teams.",
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AGRshLErzQNK5l9J_V6Nffx",
    tag: "WhatsApp",
  },
  {
    id: "topic-forms",
    title: "Google Forms",
    text: "Create forms in Hindi - field capture, approvals, and data that feeds your MIS pipeline.",
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AH-lF9s0aYPSm8g9hfHSu9R",
    tag: "Forms",
  },
  {
    id: "topic-appsheet",
    title: "AppSheet Course",
    text: "No-code AppSheet apps in Hindi - CRM, inventory, attendance, and field workflows on Sheets.",
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AHByfyaVxX7PvRsFI1AgKQm",
    tag: "AppSheet",
  },
  {
    id: "topic-dashboards",
    title: "Google Data Studio (Looker Studio)",
    text: "Step-by-step Looker Studio in Hindi - owner dashboards from Sheets and connected data.",
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AEGRsuLRVQjkCpwEpTibZv_",
    tag: "Dashboards",
  },
  {
    id: "topic-query",
    title: "Query in Google Sheets",
    text: "QUERY function series - pull and shape report data without manual copy-paste.",
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AFbq6vYp7M6OCYHDxtyBsBG",
    tag: "Query",
  },
  {
    id: "topic-functions",
    title: "Logical Functions in Google Sheets",
    text: "IF function series - conditions, validations, and smarter sheet logic.",
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AHWdLgGm1yD6C1jK0O-gGPg",
    tag: "Functions",
  },
  {
    id: "topic-docs",
    title: "Google Docs",
    text: "Full Docs course in Hindi - documents, collaboration, and a practical MS Word alternative.",
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AEaQLrgiSAO8NMnu7GWMeVS",
    tag: "Docs",
  },
];

export const paidCourses = [
  {
    title: "Google Sheets Beginner to Advanced",
    tag: "Sheets",
    text: "Formulas, data cleanup, reporting formats, and automation foundations for daily business work.",
    level: "Foundation",
    featured: true,
  },
  {
    title: "Google Forms Practical Training",
    tag: "Forms",
    text: "Capture field data, approvals, and structured inputs that feed your MIS pipeline.",
    level: "Foundation",
  },
  {
    title: "Looker Studio Dashboard Design",
    tag: "Dashboards",
    text: "Build owner-level dashboards connected to Sheets and BigQuery for clear daily control.",
    level: "Intermediate",
  },
  {
    title: "AppSheet for Business Apps",
    tag: "AppSheet",
    text: "Design mobile apps on top of Google Sheets for CRM, inventory, and operations.",
    level: "Intermediate",
  },
  {
    title: "MIS Reporting for MSME Owners",
    tag: "MIS",
    text: "Monthly MIS structure, validation, and presentation owners can read in minutes.",
    level: "Advanced",
  },
  {
    title: "Automation with AI",
    tag: "Automation",
    text: "AI-assisted workflows for reminders, approvals, and recurring reports without manual follow-up chaos.",
    level: "Advanced",
  },
];
