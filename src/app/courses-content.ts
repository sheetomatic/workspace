import { buildWhatsAppUrl } from "./site-content";
import {
  COURSE_ENROLLMENT_PRICE_INR,
  courseEnrollmentSchedule,
} from "@/lib/content/courses-enrollment";

/** 1:1 Google Sheets | AppSheet | Looker Studio coaching — 24 × 1.5h */

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
  curriculumTitle: "24 classes across Sheets, AppSheet, and Looker",
  curriculumLead:
    "Each class is 1.5 hours. Outcomes follow your use cases — inventory, attendance, CRM, tasks, and more — on Google Sheets, AppSheet, and Looker Studio.",
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
    id: "sheets",
    label: "Google Sheets foundations",
    range: "Classes 1–8",
    summary: "Clean data models, formulas, and structures you can trust for daily ops and reporting.",
    classes: [
      {
        number: 1,
        title: "Map your use cases on paper",
        outcomes: [
          "List the workflows and reports you actually need",
          "Prioritize what to build first in Sheets",
          "Agree scope for the 24-class program",
        ],
      },
      {
        number: 2,
        title: "Sheet structure that scales",
        outcomes: [
          "Design master tables vs working tabs",
          "Use IDs, statuses, and owners cleanly",
          "Avoid broken IMPORTRANGE / formula sprawl",
        ],
      },
      {
        number: 3,
        title: "Core formulas for MSME ops",
        outcomes: [
          "LOOKUP, FILTER, QUERY, and ARRAY patterns",
          "Date math and status logic",
          "Validation that staff can enter safely",
        ],
      },
      {
        number: 4,
        title: "Ops tracker build (your use case)",
        outcomes: [
          "Build one live tracker from your data",
          "Add planned vs actual style columns if useful",
          "Hand off a sheet your team can update daily",
        ],
      },
      {
        number: 5,
        title: "Multi-sheet architecture",
        outcomes: [
          "Split intake, master, and dashboard data",
          "Keep one source of truth",
          "Document how staff should enter data",
        ],
      },
      {
        number: 6,
        title: "Automation light in Sheets",
        outcomes: [
          "Simple Apps Script or native automation hooks",
          "Reminders and status flags",
          "Protect ranges without blocking work",
        ],
      },
      {
        number: 7,
        title: "Team-ready entry forms",
        outcomes: [
          "Design easy entry tabs for non-technical staff",
          "Dropdowns, checks, and required fields",
          "Reduce training time for new joiners",
        ],
      },
      {
        number: 8,
        title: "Sheets review & harden",
        outcomes: [
          "Fix edge cases from real data",
          "Lock what must not break",
          "Decide what moves to AppSheet next",
        ],
      },
    ],
  },
  {
    id: "appsheet",
    label: "AppSheet mobile apps",
    range: "Classes 9–16",
    summary: "Turn your Sheets into mobile apps your team will actually open.",
    classes: [
      {
        number: 9,
        title: "AppSheet from your Sheet",
        outcomes: [
          "Connect the right tables",
          "Choose views for phone vs desktop",
          "Ship a first working prototype",
        ],
      },
      {
        number: 10,
        title: "Forms and actions",
        outcomes: [
          "Capture entries on mobile",
          "Buttons for common status updates",
          "Photos / files when proof is needed",
        ],
      },
      {
        number: 11,
        title: "Security and roles",
        outcomes: [
          "Who can see or edit what",
          "Slice data by person or team",
          "Keep owner visibility without chaos",
        ],
      },
      {
        number: 12,
        title: "Workflows and notifications",
        outcomes: [
          "Bots for status changes",
          "Email / push where useful",
          "Avoid alert spam",
        ],
      },
      {
        number: 13,
        title: "Use-case app deep dive (part 1)",
        outcomes: [
          "Build the primary app for your business",
          "Refine UX with real staff feedback",
          "Fix slow views and clutter",
        ],
      },
      {
        number: 14,
        title: "Use-case app deep dive (part 2)",
        outcomes: [
          "Add secondary flows (approvals, follow-ups)",
          "Offline / field realities",
          "Go-live checklist for the team",
        ],
      },
      {
        number: 15,
        title: "AppSheet admin habits",
        outcomes: [
          "Version and backup discipline",
          "Change requests without breaking production",
          "Train one internal app owner",
        ],
      },
      {
        number: 16,
        title: "AppSheet review & harden",
        outcomes: [
          "Performance and error pass",
          "Document how to add a column safely",
          "Decide Looker reporting needs",
        ],
      },
    ],
  },
  {
    id: "looker",
    label: "Looker Studio dashboards",
    range: "Classes 17–24",
    summary: "Owner-ready dashboards from your Sheets — exceptions and KPIs without spreadsheet archaeology.",
    classes: [
      {
        number: 17,
        title: "Dashboard goals for owners",
        outcomes: [
          "Pick the 5–7 numbers that matter weekly",
          "Exceptions first, not every row",
          "Match charts to decisions",
        ],
      },
      {
        number: 18,
        title: "Connect Looker to Sheets",
        outcomes: [
          "Stable data ranges for Looker",
          "Refresh and cache basics",
          "Avoid fragile pivot exports",
        ],
      },
      {
        number: 19,
        title: "Build your first Looker report",
        outcomes: [
          "Scorecards, tables, and filters",
          "Date controls that work",
          "Share with the right people",
        ],
      },
      {
        number: 20,
        title: "Multi-page owner pack",
        outcomes: [
          "Ops, sales, and inventory-style pages as needed",
          "Consistent branding and layout",
          "Mobile-friendly viewing",
        ],
      },
      {
        number: 21,
        title: "Calculated fields & blends",
        outcomes: [
          "Rates, deficits, and comparisons",
          "Blend only when necessary",
          "Keep metrics explainable",
        ],
      },
      {
        number: 22,
        title: "Use-case dashboards deep dive",
        outcomes: [
          "Finish dashboards for your real data",
          "Validate numbers against Sheets",
          "Owner walkthrough script",
        ],
      },
      {
        number: 23,
        title: "Weekly review rhythm",
        outcomes: [
          "How to run a short review from Looker",
          "What staff prepare vs what auto-updates",
          "Close the loop back into Sheets / AppSheet",
        ],
      },
      {
        number: 24,
        title: "Go-live & handoff",
        outcomes: [
          "Hypercare checklist for 7 days",
          "Train your internal Sheets / AppSheet / Looker owner",
          "Document next builds after the program",
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
