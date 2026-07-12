import { buildWhatsAppUrl } from "./site-content";
import {
  COURSE_ENROLLMENT_PRICE_INR,
  courseEnrollmentSchedule,
} from "@/lib/content/courses-enrollment";

/** Owner-facing 1:1 training — 24 live classes × 1.5h = 36 hours */

export const coursesPage = {
  eyebrow: "For MSME owners",
  title: "Learn Google Sheets, AppSheet, and Looker Studio — then build what your business needs.",
  lead:
    "Live 1:1 coaching with Shyam — tools + system thinking applied to your use cases (inventory, attendance, CRM, tasks, and more). Leave with working Sheets, apps, and dashboards — not a fixed module checklist.",
  durationLabel: "24 live 1:1 classes",
  durationDetail: `1.5 hours each · ${courseEnrollmentSchedule.totalHours} hours · 2 sessions/week · Hindi / English`,
  scheduleLabel: "Weekly slots",
  scheduleDetail: `Mon+Fri or Tue+Sat · ${courseEnrollmentSchedule.sessionTimeLabel}`,
  priceLabel: "₹35,000",
  priceInr: COURSE_ENROLLMENT_PRICE_INR,
  priceNote: "Pay on this page · owner confirms · slots booked",
  ctaLabel: "Enroll & pay",
  ctaSecondaryLabel: "Open Workspace",
  ctaQuestionsLabel: "Questions on WhatsApp",
  whatsappMessage:
    "Hi Sheetomatic, I have a question about the Google Sheets / AppSheet / Looker Studio 1:1 course (24 × 1.5h / ₹35,000).",
  formatTitle: "How the program works",
  formatLead:
    "Not a jobseeker career course. Built for owners who want clean data, staff-ready apps, and live management views — taught on Google Sheets, AppSheet, and Looker Studio. No Graphy checkout — enroll and pay here.",
  curriculumTitle: "24 classes, owner outcomes",
  curriculumLead:
    "Each class is 1.5 hours. You leave with a working piece of your own system — shaped around your business, not a one-size curriculum brand.",
  videosTitle: "Watch before you enroll",
  videosLead:
    "Free Sheetomatic Videos that match the stack — Google Sheets discipline, AppSheet apps, and Looker Studio dashboards.",
  libraryTitle: "Learn from the channel",
  libraryLead:
    "Browse the free library by topic. Paid 1:1 coaching turns these into your live business system.",
  funnelTitle: "Free video → pay & book slots → build your stack",
  funnelLead:
    "Start with YouTube. Pay ₹35,000 on this page, pick Mon+Fri or Tue+Sat mornings, and ship Sheets + AppSheet + Looker for your business. Optionally run ops later in Sheetomatic Workspace.",
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
    id: "sheets-backend",
    label: "Google Sheets as the system backend",
    range: "Classes 1–6",
    summary:
      "Masters, transactions, and data discipline so apps and dashboards stay trustworthy.",
    classes: [
      {
        number: 1,
        title: "System thinking for owners",
        outcomes: [
          "Name the leaks that keep you in daily firefighting",
          "Separate masters, transactions, and status from ad-hoc tabs",
          "Pick 1–2 client use cases to build through the program",
        ],
      },
      {
        number: 2,
        title: "Map your real process on paper, then Sheets",
        outcomes: [
          "Draw Who / How / When / proof for each stage",
          "Spot missing owners and invisible delays",
          "Get a one-page flow map your team understands",
        ],
      },
      {
        number: 3,
        title: "Clean tables owners can trust",
        outcomes: [
          "Structure headers, types, and naming conventions",
          "Stop broken IMPORTRANGE / formula chaos",
          "Prepare data that AppSheet and Looker can use",
        ],
      },
      {
        number: 4,
        title: "Masters vs transactions",
        outcomes: [
          "Design IDs, relationships, and status fields",
          "Keep staff entry simple and audit-ready",
          "Freeze a schema for the use cases you chose",
        ],
      },
      {
        number: 5,
        title: "Lookups, validation, and controlled entry",
        outcomes: [
          "Use data validation and protected ranges wisely",
          "Prevent duplicate and orphan records",
          "Make wrong data hard to enter on purpose",
        ],
      },
      {
        number: 6,
        title: "Backend ready for apps & dashboards",
        outcomes: [
          "Document the sheet map for your team",
          "Define status vocabulary everyone shares",
          "Hand off a backend AppSheet and Looker can connect to",
        ],
      },
    ],
  },
  {
    id: "appsheet-apps",
    label: "AppSheet apps for your use case",
    range: "Classes 7–14",
    summary:
      "No-code apps your team will open on mobile — UX, expressions, roles, and automation around the client-chosen flow.",
    classes: [
      {
        number: 7,
        title: "AppSheet fundamentals from Sheets",
        outcomes: [
          "Stand up a working app from your backend tables",
          "Know when Sheets alone is enough vs when an app helps",
          "Ship a first internal form your staff can use today",
        ],
      },
      {
        number: 8,
        title: "UX staff will actually use",
        outcomes: [
          "Build views and forms for shop-floor reality",
          "Reduce clicks for daily updates",
          "Make proof capture (photo / note) part of the step",
        ],
      },
      {
        number: 9,
        title: "Expressions & actions that enforce process",
        outcomes: [
          "Block incomplete handoffs",
          "Auto-stamp planned vs actual timestamps",
          "Trigger the next step without WhatsApp chasing",
        ],
      },
      {
        number: 10,
        title: "Security & roles — who sees what",
        outcomes: [
          "Separate owner, manager, and staff access",
          "Protect salary / cost / customer data",
          "Set a go-live permission checklist",
        ],
      },
      {
        number: 11,
        title: "Example build: attendance or leave",
        outcomes: [
          "Capture present / leave without Excel arguments",
          "Give managers a clear exception list",
          "Reuse the pattern for other HR-style apps",
        ],
      },
      {
        number: 12,
        title: "Example build: tasks or CRM follow-up",
        outcomes: [
          "Assign owners, due dates, and status in one place",
          "Track enquiry → quote → order without lost leads",
          "Surface stalled work for your weekly review",
        ],
      },
      {
        number: 13,
        title: "Example build: inventory or purchase",
        outcomes: [
          "Replace shadow stock sheets with one balance",
          "Raise and track purchase lines with owners",
          "Connect receipts to movement where it matters",
        ],
      },
      {
        number: 14,
        title: "Automations & reminders for your app",
        outcomes: [
          "Automate due / overdue alerts to staff",
          "Keep WhatsApp for internal ops nudges — not chaos",
          "Cut manual follow-up messages from your day",
        ],
      },
    ],
  },
  {
    id: "looker-dashboards",
    label: "Looker Studio for management views",
    range: "Classes 15–20",
    summary:
      "Live dashboards so owners and managers review exceptions and numbers — without Sunday prep in a new spreadsheet.",
    classes: [
      {
        number: 15,
        title: "Looker Studio foundations",
        outcomes: [
          "Connect Sheets / AppSheet data to a live board",
          "Design pages leadership can read in minutes",
          "Avoid vanity charts that hide leaks",
        ],
      },
      {
        number: 16,
        title: "Metrics that match how you manage",
        outcomes: [
          "Define KPIs from your chosen use cases",
          "Show pending, overdue, and late work clearly",
          "Build person-wise and team views that drive action",
        ],
      },
      {
        number: 17,
        title: "Exceptions-first dashboards",
        outcomes: [
          "Build views that show only overdue / pending / stock risk",
          "Give managers a daily queue, not a data dump",
          "Prepare the habit of reviewing exceptions, not everything",
        ],
      },
      {
        number: 18,
        title: "Planned vs actual & delay visibility",
        outcomes: [
          "Track stage timing and delay where SLA matters",
          "Make delay visible before the weekly meeting",
          "Stop the blame game with shared timestamps",
        ],
      },
      {
        number: 19,
        title: "Escalations & approval trails",
        outcomes: [
          "Route breaches to the right manager",
          "Keep approval trails without email ping-pong",
          "Define what must escalate same-day vs next review",
        ],
      },
      {
        number: 20,
        title: "Owner weekly board",
        outcomes: [
          "Assemble the weekly review from live systems",
          "Run the meeting on delays and ownership gaps",
          "Leave with actions — not a new spreadsheet homework list",
        ],
      },
    ],
  },
  {
    id: "capstone",
    label: "Capstone: deploy your app + dashboard",
    range: "Classes 21–24",
    summary:
      "Ship one live Sheets + AppSheet + Looker system for your company and hand it to your team.",
    classes: [
      {
        number: 21,
        title: "Blueprint your client system",
        outcomes: [
          "Prioritize the 2–3 flows that unlock calmer ops",
          "Define daily / weekly rituals for owners and managers",
          "Lock scope for go-live — no endless rebuild",
        ],
      },
      {
        number: 22,
        title: "Harden security, data, and SOPs",
        outcomes: [
          "Stress-test permissions and backups",
          "Write the two-page SOP staff can follow",
          "Fix the top failure modes before launch",
        ],
      },
      {
        number: 23,
        title: "Go-live with your team",
        outcomes: [
          "Launch with a 7-day hypercare checklist",
          "Train staff on the exception queue and app views",
          "Confirm Looker boards match how you run reviews",
        ],
      },
      {
        number: 24,
        title: "Handoff & next steps",
        outcomes: [
          "Document owners for sheets, app, and dashboards",
          "Plan the next use case after the first is stable",
          "Decide next: deepen Sheets apps or move to Sheetomatic Workspace",
        ],
      },
    ],
  },
];

export const courseFormatBullets = [
  "24 live 1:1 sessions with Shyam — not a recorded binge course",
  "1.5 hours each (36 hours) · weekly 2 sessions at 8:30–10:00 AM IST",
  "Choose your cohort: Monday + Friday, or Tuesday + Saturday",
  "Pay ₹35,000 on this page (UPI / PhonePe) — owner confirms payment, then slots are booked",
  "Stack: Google Sheets + AppSheet + Looker Studio — applied to your business use cases",
  "After training: optionally run ops in Sheetomatic Workspace if you want software, not only Sheets",
] as const;
