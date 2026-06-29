export type PacePillar = {
  letter: "P" | "A" | "C" | "E";
  title: string;
  problem: string;
  sheetomaticSolution: string;
  moduleHref: string;
  moduleLabel: string;
};

export type BuildManageScalePhase = {
  phase: "Build" | "Manage" | "Scale";
  title: string;
  text: string;
  modules: string[];
};

/** Core message from MSME scaling playbook: systems + teams, not founder firefighting. */
export const videoSalesStory = {
  eyebrow: "For owners already running a business",
  title: "You built the business. Now build the system so it grows without you.",
  lead:
    "Starting is easy. Sustaining is hard when every decision, reminder, and report runs through you. Sheetomatic maps profit, leads, conversions, and team delivery into one workspace - so you review numbers, not chase people.",
  ctaPrimary: "Scope my workspace",
} as const;

export type HowWeWorkStep = {
  step: string;
  title: string;
  userAction: string;
  weDo: string;
  outcome: string;
};

/** Engagement process - inspired by phased MSME SaaS rollouts, not one big-bang installs. */
export const howWeWork = {
  eyebrow: "How we work",
  title: "Four steps from spreadsheet chaos to a system your team runs daily",
  lead:
    "We start with how you operate today - not a software demo. One module goes live first. The rest layers in as adoption sticks.",
  steps: [
    {
      step: "01",
      title: "Discover your operations",
      userAction:
        "Share how orders, stock, WhatsApp leads, and Monday numbers move today - and who owns each step.",
      weDo:
        "Map gaps on a scoping call - spreadsheets, chats, checklists, and role handoffs included.",
      outcome:
        "One scoped first system: FMS, IMS, CRM, EM, or AI - matched to your biggest operational leak.",
    },
    {
      step: "02",
      title: "Pilot one module",
      userAction:
        "Nominate module owners and a small team - sales head, store manager, or ops lead - for the first rollout.",
      weDo:
        "Configure roles, flows, and alerts in your Workspace - typically 2 to 4 weeks.",
      outcome: "Live data your managers trust before we add anything else.",
    },
    {
      step: "03",
      title: "Roll out in phases",
      userAction:
        "Expand to the next leak once daily use is stable - assign PC and EA roles where checklists and tasks belong.",
      weDo:
        "Layer Build, Manage, and Scale systems - FMS, IMS, CRM, EM, Checklist and Tasks portals, and WhatsApp AI.",
      outcome: "Systems replace founder reminders - not another tab nobody opens.",
    },
    {
      step: "04",
      title: "Review on Monday",
      userAction:
        "Open the executive board once a week - exceptions only, after your team has run the daily rhythm.",
      weDo:
        "EM assembles person-wise deficits and overdue flow automatically from live module data.",
      outcome: "You review numbers and coach gaps - not chase updates on WhatsApp.",
    },
  ] satisfies HowWeWorkStep[],
  principles: [
    "One strong module beats five half-built systems",
    "Plain timelines and costs - no surprise scope",
    "Phased rollout, not a single big-bang go-live",
  ],
} as const;

export const workShowcaseStats = [
  { value: "19+", label: "Named MSME deployments" },
  { value: "1000+", label: "WhatsApp API clients" },
  { value: "100+", label: "Attendance rollouts" },
  { value: "4 regions", label: "India, UAE, Oman, and HK" },
] as const;

/** Rajiv-style audience filter: running MSMEs, not startup experiments. */
export const audienceFilter = {
  title: "Is Sheetomatic for you?",
  forYou: {
    label: "Built for you if",
    items: [
      "You run a revenue-generating MSME with payroll, inventory or service delivery, and a team beyond just you",
      "Ops, sales, or store roles exist - but handoffs still land on your WhatsApp",
      "Monday numbers, collections, or margin feel late, manual, or untrusted",
      "You will assign Process Coordinators and Executive Assistants and review exceptions weekly - not chase every task yourself",
    ],
  },
  notForYou: {
    label: "Not the right fit if",
    items: [
      "You are still validating a business idea with no daily operations or team rhythm yet",
      "You want a one-day install with no portal discipline, role owners, or weekly review cadence",
      "You expect the founder to stay the reminder system instead of empowering PC and EA roles",
    ],
  },
} as const;

export const paceFramework = {
  eyebrow: "The operating framework",
  title: "P.A.C.E. your business on one workspace",
  lead:
    "Profit, Attract, Convert, Empower - four levers most MSME owners juggle in spreadsheets and WhatsApp. Sheetomatic maps each to systems and portals you roll out step by step.",
  pillars: [
    {
      letter: "P",
      title: "Profit",
      problem:
        "Margin leaks hide in delayed dispatch, stock mismatch, and collections nobody tracks until month-end.",
      sheetomaticSolution:
        "FMS shows where orders stall. IMS ties stock to live flow. Both stop silent leaks before they hit your P&L.",
      moduleHref: "/services/flow",
      moduleLabel: "Explore FMS",
    },
    {
      letter: "A",
      title: "Attract",
      problem:
        "Enquiries arrive after hours on WhatsApp. By morning the lead has already called your competitor.",
      sheetomaticSolution:
        "Sheetomatic AI replies on official WhatsApp Business API - qualifies, captures, and hands off to your team 24/7.",
      moduleHref: "/ai",
      moduleLabel: "Explore Sheetomatic AI",
    },
    {
      letter: "C",
      title: "Convert",
      problem:
        "Leads sit in personal chats. Follow-ups depend on memory. Pipeline visibility stops at the sales head.",
      sheetomaticSolution:
        "CRM inbox tracks every conversation. Executive Assistants get scored follow-ups in the Tasks portal until quotes close.",
      moduleHref: "/ai/crm",
      moduleLabel: "Explore CRM inbox",
    },
    {
      letter: "E",
      title: "Empower",
      problem:
        "The owner becomes the reminder system - chasing daily standards, handoffs, and accountability on WhatsApp.",
      sheetomaticSolution:
        "Process Coordinators run standards in the Checklist portal. Executive Assistants drive follow-through in the Tasks portal. You monitor completion scores and coach exceptions - not every ping.",
      moduleHref: "/services/checklist",
      moduleLabel: "Explore Checklist and Tasks portals",
    },
  ] satisfies PacePillar[],
} as const;

export const buildManageScale = {
  eyebrow: "How we roll out",
  title: "Build. Manage. Scale. - not one big bang",
  lead:
    "Start with the leak that hurts most. Layer modules until the business runs on systems, not founder memory.",
  phases: [
    {
      phase: "Build",
      title: "Fix the foundation",
      text:
        "Map flow and stock on one call. We configure FMS and IMS so enquiry-to-cash and inventory match reality.",
      modules: ["FMS", "IMS"],
    },
    {
      phase: "Manage",
      title: "Run daily ops without you in every chat",
      text:
        "Process Coordinators run daily standards in the Checklist portal. Executive Assistants track follow-through in the Tasks portal. Managers monitor scores; you review exceptions.",
      modules: ["Checklist", "Tasks"],
    },
    {
      phase: "Scale",
      title: "Grow with AI and Monday clarity",
      text:
        "Sheetomatic AI captures leads overnight. EM (Executive Meeting) assembles the board every Monday - exceptions only, no Sunday fire drill.",
      modules: ["Sheetomatic AI", "EM"],
    },
  ] satisfies BuildManageScalePhase[],
} as const;
