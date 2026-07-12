import { buildWhatsAppUrl } from "./site-content";

/** Owner-facing 1:1 training — 24 live classes × 1.5h = 36 hours */

export const coursesPage = {
  eyebrow: "For MSME owners",
  title: "Build systems so you can run the business one day a week.",
  lead:
    "Live 1:1 coaching with Shyam — FMS, IMS, Process Checklists, Task Delegation, Attendance, and Executive MIS — so you stop firefighting and start weekly reviews with live data.",
  durationLabel: "24 live 1:1 classes",
  durationDetail: "1.5 hours each · 36 hours total · Hindi / English",
  priceLabel: "₹35,000",
  priceNote: "Owner systems program — enroll on WhatsApp",
  ctaLabel: "Enroll on WhatsApp",
  ctaSecondaryLabel: "Open Workspace",
  whatsappMessage:
    "Hi Sheetomatic, I want to enroll in the owner systems course (24 × 1.5h / ₹35,000).",
  formatTitle: "How the program works",
  formatLead:
    "Not a jobseeker MIS career course. Built for business owners who want an autopilot ops stack — then optionally run it in Sheetomatic Workspace.",
  curriculumTitle: "24 classes, owner outcomes",
  curriculumLead:
    "Each class is 1.5 hours. You leave with a working piece of your own business system — not slide decks.",
  videosTitle: "Watch before you enroll",
  videosLead:
    "Free Sheetomatic Videos that match what we build in the program — FMS, AppSheet, and Executive MIS.",
  libraryTitle: "Learn from the channel",
  libraryLead:
    "Browse the free library by topic. Paid 1:1 coaching turns these into your live business system.",
  funnelTitle: "Free video → paid coaching → Workspace",
  funnelLead:
    "Start with YouTube. Enroll for 1:1 build-with-you coaching. Run FMS, IMS, PC, EA, and EM in Sheetomatic Workspace when you are ready.",
  instructorNote: "Instructor: Shyam Kumar Banjare",
} as const;

export const coursesWhatsAppUrl = buildWhatsAppUrl(coursesPage.whatsappMessage);

export type CoursePhase = {
  id: string;
  label: string;
  range: string;
  summary: string;
  classes: {
    number: number;
    title: string;
    outcomes: string[];
  }[];
};

export const coursePhases: CoursePhase[] = [
  {
    id: "foundation",
    label: "Foundation & process mapping",
    range: "Classes 1–4",
    summary: "Clarify owner OS language and map your real flows before building apps.",
    classes: [
      {
        number: 1,
        title: "Owner OS: FMS, IMS, PC, EA, EM",
        outcomes: [
          "Name the leaks that keep you in daily firefighting",
          "See how BCI-style systems replace blame with ownership",
          "Decide what must auto-update before your weekly EM",
        ],
      },
      {
        number: 2,
        title: "Map enquiry-to-cash on paper, then Sheets",
        outcomes: [
          "Draw Who / How / When / proof for each stage",
          "Spot missing owners and invisible delays",
          "Get a one-page flow map your team understands",
        ],
      },
      {
        number: 3,
        title: "Google Sheets as the system backend",
        outcomes: [
          "Structure clean tables owners can trust",
          "Stop broken IMPORTRANGE / formula chaos",
          "Prepare data that AppSheet and Looker can use",
        ],
      },
      {
        number: 4,
        title: "Data model for MSME ops",
        outcomes: [
          "Design IDs, relationships, and status fields",
          "Keep staff entry simple and audit-ready",
          "Freeze a schema for Attendance, Tasks, IMS, and FMS",
        ],
      },
    ],
  },
  {
    id: "appsheet-core",
    label: "AppSheet core for owners",
    range: "Classes 5–8",
    summary: "No-code apps your team will open on mobile — without depending on IT.",
    classes: [
      {
        number: 5,
        title: "AppSheet fundamentals from Sheets",
        outcomes: [
          "Stand up a working app from your backend tables",
          "Know when Sheets is enough vs when Workspace fits",
          "Ship a first internal form your staff can use today",
        ],
      },
      {
        number: 6,
        title: "UX staff will actually use",
        outcomes: [
          "Build views and forms for shop-floor reality",
          "Reduce clicks for daily updates",
          "Make proof capture (photo / note) part of the step",
        ],
      },
      {
        number: 7,
        title: "Expressions & actions that enforce process",
        outcomes: [
          "Block incomplete handoffs",
          "Auto-stamp planned vs actual timestamps",
          "Trigger the next step without WhatsApp chasing",
        ],
      },
      {
        number: 8,
        title: "Security & roles — who sees what",
        outcomes: [
          "Separate owner, PC, EA, and staff access",
          "Protect salary / cost / customer data",
          "Set a go-live permission checklist",
        ],
      },
    ],
  },
  {
    id: "core-ops",
    label: "Build core ops systems",
    range: "Classes 9–14",
    summary: "Ship the modules owners use weekly — Attendance, Tasks, CRM, IMS, Purchase.",
    classes: [
      {
        number: 9,
        title: "Attendance & Leave",
        outcomes: [
          "Capture present / leave without Excel arguments",
          "Give managers a clear exception list",
          "Feed headcount discipline into MIS",
        ],
      },
      {
        number: 10,
        title: "Task Delegation (EA module)",
        outcomes: [
          "Assign owners, due dates, and status in one place",
          "See pending and delayed work as deficit — not % done",
          "Stop status meetings that only gather updates",
        ],
      },
      {
        number: 11,
        title: "CRM / Leads follow-up",
        outcomes: [
          "Track enquiry → quote → order without lost leads",
          "Give sales a simple pipeline they will update",
          "Surface stalled deals for the weekly review",
        ],
      },
      {
        number: 12,
        title: "IMS — stock in, out, and balances",
        outcomes: [
          "Replace shadow stock sheets with one balance",
          "Flag reorder and shortage exceptions",
          "Connect stock truth to dispatch and purchase",
        ],
      },
      {
        number: 13,
        title: "Purchase Order flow",
        outcomes: [
          "Raise, approve, and track POs with owners",
          "Link receipts to inventory movement",
          "Close the loop from indent to stock",
        ],
      },
      {
        number: 14,
        title: "Field / complaint / helpdesk tracking",
        outcomes: [
          "Log field visits or complaints with proof",
          "Escalate open tickets before customers chase you",
          "Roll exceptions into the same EM board",
        ],
      },
    ],
  },
  {
    id: "automation",
    label: "Automation, escalations, control",
    range: "Classes 15–18",
    summary: "Reminders, SLA delay, and exception views so the system nudges people — not you.",
    classes: [
      {
        number: 15,
        title: "Reminders & WhatsApp nudges",
        outcomes: [
          "Automate due / overdue alerts to staff",
          "Keep WhatsApp for internal ops — not customer bot chaos",
          "Cut manual follow-up messages from your day",
        ],
      },
      {
        number: 16,
        title: "FMS delays: planned vs actual",
        outcomes: [
          "Track stage SLA and time delay per job",
          "Make delay visible before the weekly meeting",
          "Stop the blame game with shared timestamps",
        ],
      },
      {
        number: 17,
        title: "Escalations & approvals",
        outcomes: [
          "Route breaches to the right manager",
          "Keep approval trails without email ping-pong",
          "Define what must escalate same-day vs next EM",
        ],
      },
      {
        number: 18,
        title: "Control tower: exceptions first",
        outcomes: [
          "Build views that show only overdue / pending / stock risk",
          "Give PC and EA a daily queue, not a data dump",
          "Prepare the habit of reviewing exceptions, not everything",
        ],
      },
    ],
  },
  {
    id: "em-mis",
    label: "Looker, Executive MIS & EM-ready",
    range: "Classes 19–21",
    summary: "Owner dashboards so Monday EM starts with live numbers — zero prep hire.",
    classes: [
      {
        number: 19,
        title: "Looker Studio for owners",
        outcomes: [
          "Connect Sheets / AppSheet data to a live board",
          "Design pages leadership can read in minutes",
          "Avoid vanity charts that hide leaks",
        ],
      },
      {
        number: 20,
        title: "Person-wise KRA / KPI as deficit %",
        outcomes: [
          "Score pending, overdue, and late as penalties — not 80% done",
          "Roll Tasks + FMS + IMS + checklists into one person view",
          "Walk into EM with accountability, not arguments",
        ],
      },
      {
        number: 21,
        title: "Weekly EM board — exceptions only",
        outcomes: [
          "Assemble the Monday review from live systems",
          "Run the meeting on delays and ownership gaps",
          "Leave with actions — not a new spreadsheet homework list",
        ],
      },
    ],
  },
  {
    id: "capstone",
    label: "Capstone: your business system + go-live",
    range: "Classes 22–24",
    summary: "Ship one live system for your company and hand it to PC / EA roles.",
    classes: [
      {
        number: 22,
        title: "Blueprint your business system",
        outcomes: [
          "Prioritize the 2–3 flows that unlock one-day-a-week ops",
          "Define PC and EA daily / weekly rituals",
          "Lock scope for go-live — no endless rebuild",
        ],
      },
      {
        number: 23,
        title: "Harden security, data, and SOPs",
        outcomes: [
          "Stress-test permissions and backups",
          "Write the two-page SOP staff can follow",
          "Fix the top failure modes before launch",
        ],
      },
      {
        number: 24,
        title: "Go-live & handoff",
        outcomes: [
          "Launch with a 7-day hypercare checklist",
          "Train PC / EA on the exception queue",
          "Decide next: deepen Sheets apps or move to Sheetomatic Workspace",
        ],
      },
    ],
  },
];

export const courseFormatBullets = [
  "24 live 1:1 sessions with Shyam — not a recorded binge course",
  "1.5 hours each (36 hours) focused on your company data",
  "Build FMS, IMS, Tasks, Attendance, CRM, Purchase, and EM dashboards",
  "After training: run the same rhythm in Sheetomatic Workspace if you want software, not only Sheets",
] as const;
