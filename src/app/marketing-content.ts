export const aiCapabilities = [
  {
    title: "AI task creation",
    text: "Turn a voice note, WhatsApp message, or quick instruction into a structured task with owner, priority, and due time.",
    tag: "Tasks",
  },
  {
    title: "AI follow-up sequencing",
    text: "Suggest next actions for leads, payments, and pending approvals so managers stop chasing updates manually.",
    tag: "Follow-ups",
  },
  {
    title: "AI MIS summaries",
    text: "Daily owner summaries across sales, collections, and exceptions - readable in under 60 seconds.",
    tag: "MIS",
  },
  {
    title: "AI workflow setup",
    text: "Faster blueprinting for sheets, AppSheet apps, dashboards, and reminder rules during implementation.",
    tag: "Setup",
  },
];

export const uspSection = {
  eyebrow: "Your control stack",
  title: "Four systems owners actually open",
  subcopy:
    "Flow, stock, performance, and tasks in one practical layer on Google Workspace - without paying for ERP modules your team will not use.",
  systems: [
    {
      acronym: "FMS",
      name: "Flow Monitoring Systems",
      text: "Know which orders, payments, and jobs are late before they hurt margin - with clear owners on every step.",
      icon: "workflow",
    },
    {
      acronym: "IMS",
      name: "Inventory Management System",
      text: "Stop guessing stock. See balances, movement, and reorder points tied to real sales and purchase data.",
      icon: "inventory",
    },
    {
      acronym: "PMS",
      name: "Performance Management System",
      text: "Targets vs actuals and team KPIs in one view - daily and monthly, not a surprise at month-end.",
      icon: "performance",
    },
    {
      acronym: "TD",
      name: "Task Delegation",
      text: "Work assigned with owner, due date, and reminders - so nothing lives only in someone's head or chat.",
      icon: "delegation",
    },
  ],
  checklistBlock: {
    title: "Checklist system",
    text: "Standard operating checklists your team runs on mobile - with timestamps, photos, and exception flags for managers.",
    icon: "checklist",
    areas: [
      { label: "Maintenance", note: "Plant, equipment, and facility rounds" },
      { label: "Accounts", note: "Month-end, GST, and payment discipline" },
      { label: "HR", note: "Onboarding, attendance, and policy compliance" },
    ],
  },
};

export const platformPillars = [
  {
    title: "AI-first operations",
    text: "Instruction to action: tasks, reminders, and summaries generated from how your team already communicates.",
    tag: "AI core",
  },
  {
    title: "Client workspaces",
    text: "Each company gets a secure, isolated workspace. Your data stays separate from other clients.",
    tag: "Multi-tenant",
  },
  {
    title: "Role-based access",
    text: "Owner, Admin, Manager, Staff, and Viewer roles control who can enter, approve, or only view.",
    tag: "RBAC",
  },
  {
    title: "Google Workspace layer",
    text: "Sheets, AppSheet, Looker Studio, Apps Script, and WhatsApp connected under one control system.",
    tag: "Integrations",
  },
];

export const focusOffers = [
  {
    id: "mis-payroll",
    tag: "Off-site MIS",
    title: "MIS talent on Sheetomatic Payroll - not on your books",
    whyTitle: "Why this matters",
    whyText:
      "When you hire MIS staff directly, recurring cost hits you every month: ESI, PF, office rent, internet, and laptop or system purchase.",
    solutionTitle: "What you save with us",
    solutionText:
      "Hire on Sheetomatic Payroll for off-site MIS support. We handle the employment layer so you get reporting capacity without carrying full payroll overhead on your balance sheet.",
    savings: ["No ESI on your books", "No PF liability", "No office setup", "No laptop capex"],
    ctaNote: "Start hiring from Sheetomatic today. Call us for payroll and MIS scope details.",
    featured: true,
  },
  {
    id: "custom-apps",
    tag: "Custom systems",
    title: "Stop juggling software with no real analysis",
    whyTitle: "Sound familiar?",
    whyText:
      "Many MSMEs run multiple applications, ERP modules, and spreadsheets - but owners still do not get clear daily analysis or one place to act.",
    solutionTitle: "Try a custom application instead",
    solutionText:
      "We build tailored apps on AppSheet with Google Sheets and BigQuery, plus custom software where you need it - designed around how your team actually works.",
    savings: [
      "One system for your process",
      "Dashboards owners understand",
      "Apps your team adopts",
      "Built and maintained by Sheetomatic",
    ],
    ctaNote: "Replace tool sprawl with a system that gives analysis, not just data entry.",
  },
  {
    id: "pro-website",
    tag: "Web presence",
    title: "Pro-level website at practical cost",
    whyTitle: "Why owners ask us",
    whyText:
      "You need a trustworthy site that explains your offer, captures leads, and supports consultation - without agency pricing that does not fit MSME budgets.",
    solutionTitle: "Let's connect on Google Meet",
    solutionText:
      "We design and build conversion-focused websites aligned with your automation and AI story. Book a slot and we will scope pages, messaging, and delivery timeline together.",
    savings: [
      "Professional brand presence",
      "Clear service positioning",
      "Consult Today integration",
      "Low-cost delivery model",
    ],
    ctaNote: "Need a pro website without overspending? Consult Today and we will plan it on a call.",
  },
];

export const engagementModels = [
  {
    name: "AI workspace platform",
    summary:
      "Hosted client login with AI task creation, dashboards, and role-based modules per organization.",
    points: [
      "AI instruction to structured tasks",
      "Secure sign-in per organization",
      "MIS, approvals, and reports modules",
    ],
    cta: "Consult Today",
    href: "https://calendar.app.google/MVmguFeQZpMNDTFo9",
    featured: true,
  },
  {
    name: "Implementation consultancy",
    summary:
      "We design and build your Google Workspace operating system: sheets, apps, dashboards, scripts.",
    points: [
      "Process mapping and solution design",
      "AppSheet and Looker delivery",
      "Go-live support and handover",
    ],
    cta: "View implementation",
    href: "/services",
  },
  {
    name: "Managed support",
    summary:
      "Ongoing MIS fixes, enhancements, and team guidance so the system keeps working after launch.",
    points: [
      "Monthly reporting support",
      "Expert hours for changes",
      "Training for internal teams",
    ],
    cta: "MIS support options",
    href: "/services",
  },
];

export const deliverySteps = [
  {
    step: "01",
    title: "Discover",
    text: "Audit spreadsheets, WhatsApp habits, and reporting pain. Define the first workflow to automate.",
  },
  {
    step: "02",
    title: "Design",
    text: "Blueprint data model, roles, approvals, dashboards, and integration map on Google Workspace.",
  },
  {
    step: "03",
    title: "Deploy",
    text: "Build AppSheet apps, sheets, Looker views, and client workspace access. Test with real data.",
  },
  {
    step: "04",
    title: "Support",
    text: "Train your team, monitor adoption, and iterate with managed support or expert hour packs.",
  },
];

export const pricingSection = {
  eyebrow: "MIS support",
  title: "Off-site MIS on Sheetomatic payroll",
  subcopy:
    "Choose hours and days per week. Scope and skills (Sheets, AppSheet, dashboards) are confirmed on a consultation call.",
};

export const misSupportPlans = [
  {
    name: "Part-time daily",
    schedule: "4 hours, 5 days per week",
    description:
      "Steady daily MIS: sheet upkeep, reporting, and follow-ups without carrying full payroll on your books.",
    includes: [
      "Resource on Sheetomatic payroll",
      "Google Sheets and Excel MIS work",
      "Off-site / remote delivery",
      "Laptop and connectivity via Sheetomatic",
    ],
    cta: "Enquire on WhatsApp",
    message: "Hi Sheetomatic, I want MIS support: 4 hours, 5 days per week.",
  },
  {
    name: "Focused days",
    schedule: "8 hours, 3 days per week",
    description:
      "Longer blocks on three days - strong for dashboard builds, AppSheet fixes, and monthly MIS delivery.",
    includes: [
      "Same Sheetomatic payroll model",
      "24 hours per week capacity",
      "Dashboard and automation focus",
      "Flexible mid-week scheduling",
    ],
    cta: "Enquire on WhatsApp",
    featured: true,
    badge: "Flexible",
    message: "Hi Sheetomatic, I want MIS support: 8 hours, 3 days per week.",
  },
  {
    name: "Full week MIS",
    schedule: "8 hours, 5 days per week",
    description:
      "Full-week bench for owners who need daily MIS rhythm, owner dashboards, and live reporting support.",
    includes: [
      "40 hours per week coverage",
      "Daily MIS and exception tracking",
      "AppSheet / Apps Script as skills allow",
      "Senior or complex scope available on consultation",
    ],
    cta: "Enquire on WhatsApp",
    message: "Hi Sheetomatic, I want MIS support: 8 hours, 5 days per week.",
  },
];

export const trustTools = [
  "Google Sheets",
  "AppSheet",
  "Looker Studio",
  "Apps Script",
  "WhatsApp API",
  "Google Drive",
  "BigQuery",
];

export const industriesSection = {
  eyebrow: "Industries",
  title: "Operational MSMEs we serve across India",
  subcopy:
    "Owner-led businesses that run on spreadsheets, WhatsApp, and daily follow-ups - and need MIS, apps, or AI without heavy IT overhead.",
  items: [
    {
      icon: "factory",
      name: "Manufacturing",
      note: "Production MIS, stock, dispatch, and collections",
    },
    {
      icon: "store",
      name: "Retail & distribution",
      note: "Daily sales, margin, and payment tracking",
    },
    {
      icon: "truck",
      name: "Logistics & transport",
      note: "Trip sheets, billing, and exception alerts",
    },
    {
      icon: "briefcase",
      name: "CA & professional firms",
      note: "Client MIS packs and recurring reporting",
    },
    {
      icon: "stethoscope",
      name: "Clinics & healthcare",
      note: "Appointments, billing, and owner summaries",
    },
    {
      icon: "building",
      name: "Real estate & construction",
      note: "Lead follow-up, site progress, and cash flow",
    },
    {
      icon: "plane",
      name: "Hospitality & travel",
      note: "Bookings, reminders, and team tasking",
    },
    {
      icon: "graduation-cap",
      name: "Training & services",
      note: "CRM-style follow-ups on Google Workspace",
    },
  ],
};

export const outcomesSection = {
  eyebrow: "Outcomes",
  title: "What changes after Sheetomatic is live",
  subcopy:
    "Results from MIS support, custom Google systems, and AI-assisted operations - not generic software promises.",
  items: [
    {
      highlight: "MIS on our payroll",
      title: "Reporting capacity without full payroll load",
      text: "Hire off-site MIS on Sheetomatic payroll. You avoid ESI, PF, office, and laptop costs on your own books.",
    },
    {
      highlight: "One system, clear analysis",
      title: "Replace scattered tools with one custom app",
      text: "AppSheet, Sheets, and dashboards built for your process - so owners see daily numbers, not disconnected data entry.",
    },
    {
      highlight: "Instruction to task",
      title: "AI and WhatsApp drive follow-ups",
      text: "Managers assign work once. Tasks, owners, priorities, and reminders run from sheet status - less chasing on calls.",
    },
    {
      highlight: "Owner view under 60 sec",
      title: "Dashboards owners actually open",
      text: "Daily MIS, exceptions, and collections in Looker or sheet views your team maintains with our implementation support.",
    },
  ],
};

/** @deprecated Use outcomesSection.items */
export const outcomeStories = outcomesSection.items.map((item) => ({
  result: item.highlight,
  title: item.title,
  text: item.text,
}));

export const misTalentCareers = {
  kicker: "Join our MIS bench",
  title: "Have MIS skills but no job? Join Sheetomatic.",
  lead:
    "We hire capable people on Sheetomatic Payroll and place them as off-site MIS support for Indian MSMEs. You work on sheets, dashboards, and reporting - we handle payroll routing and client delivery structure.",
  fitTitle: "You are a good fit if",
  fitPoints: [
    "You are strong in Google Sheets, Excel, or MIS reporting",
    "You are willing to learn AppSheet, dashboards, or Apps Script",
    "You are reliable, detail-oriented, and fine with remote work",
    "You want steady client work instead of chasing freelance gigs",
  ],
  perksTitle: "Why join Sheetomatic",
  perks: [
    "Employment on Sheetomatic Payroll",
    "Off-site work - no client office commute",
    "Real MSME systems, not dummy practice files",
    "Mentorship from the implementation team",
  ],
  steps: [
    {
      step: "01",
      title: "Reach out",
      text: "WhatsApp us with your skills, city, and experience.",
    },
    {
      step: "02",
      title: "Practical check",
      text: "Short sheet task or sample of your past MIS work - no long exams.",
    },
    {
      step: "03",
      title: "On payroll",
      text: "When matched to a client scope, you join Sheetomatic Payroll and start delivery.",
    },
  ],
  ctaNote:
    "Mention MIS talent in your WhatsApp message. We are building the bench for owners who hire off-site MIS through us.",
  whatsappApplyMessage:
    "Hi Sheetomatic, I have MIS skills and would like to join your payroll team.",
};
