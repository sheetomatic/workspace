export type CourseProgramId = "BUSINESS_OWNER" | "WORKING_PROFESSIONAL";

export type CourseClass = {
  number: number;
  title: string;
  outcome: string;
};

export type CoursePhase = {
  id: string;
  label: string;
  range: string;
  summary: string;
  classes: CourseClass[];
};

export type CourseArea = {
  id: string;
  title: string;
  summary: string;
  pointers: string[];
};

export type CourseProgram = {
  id: CourseProgramId;
  name: string;
  eyebrow: string;
  promise: string;
  priceInr: number;
  /** 50% to confirm the seat and book slots. Balance before class 1. GST extra. */
  advanceInr: number;
  totalClasses: number;
  sessionDurationMin: number;
  sessionDurationLabel: string;
  sessionTimeIst: "08:30";
  sessionTimeLabel: string;
  totalHours: number;
  weeksLabel: string;
  tools: string;
  classRhythm: string;
  terms: string[];
  phases: CoursePhase[];
  /** Pointer-wise coverage. When set, the page shows these instead of class cards. */
  areas?: CourseArea[];
  /** Requirement meeting before payment. */
  bookFirst?: boolean;
};

function phase(
  id: string,
  label: string,
  range: string,
  summary: string,
  classes: CourseClass[],
): CoursePhase {
  return { id, label, range, summary, classes };
}

function cls(number: number, title: string, outcome: string): CourseClass {
  return { number, title, outcome };
}

const sharedTerms = [
  "GST is extra.",
  "50% confirms the seat and books the slots. The balance is due before class 1.",
  "Cohorts: Monday + Friday, or Tuesday + Saturday.",
  "One seat, one person. Hindi or English.",
  "A missed class with a day’s notice can be made up once. A no-show is a used class.",
  "Recordings stay in that learner’s login.",
] as const;

export const coursePrograms: CourseProgram[] = [
  {
    id: "BUSINESS_OWNER",
    name: "Business Owners",
    eyebrow: "A ready system, on your data",
    promise:
      "You leave with a system your people can use: Sales, Operations, Inventory, and Dispatch. Built for how your shop actually runs, on Google Sheets, AppSheet, Apps Script, and a Google Site you open for the week.",
    priceInr: 110_000,
    advanceInr: 55_000,
    totalClasses: 30,
    sessionDurationMin: 120,
    sessionDurationLabel: "2 hours",
    sessionTimeIst: "08:30",
    sessionTimeLabel: "8:30–10:30 AM IST",
    totalHours: 60,
    weeksLabel: "about 15 weeks",
    tools:
      "Google Sheets, AppSheet, Apps Script, and Google Sites. The Site is the page you open. The sheet stays the record.",
    classRhythm:
      "First a requirement meeting, on your work. Then 30 classes. Most of the hour is building on your files. The last part teaches the method only if you want to change it yourself later.",
    bookFirst: true,
    terms: [
      "Book a requirement meeting first. Enroll after you are sure this is the system you want.",
      ...sharedTerms,
      "Scope is Sales, Operations or production, Inventory, and Dispatch for one company. A second company is a new quote.",
      "You bring access, a person who does the work, and real orders. If that is late, the dates move.",
    ],
    areas: [
      {
        id: "sales",
        title: "Sales",
        summary: "From the enquiry to the money, with one name on each open item.",
        pointers: [
          "Every enquiry has one owner and a next date.",
          "The quote, the rate, and what was promised sit on the same row as the order.",
          "A follow-up that is late shows as a gap, not a green percent.",
          "Collection pending is a name, an amount, and how many days.",
          "Before the weekly meeting you see which orders are stuck, and with whom.",
        ],
      },
      {
        id: "operations",
        title: "Operations, production, manufacturing",
        summary: "The job on the floor: plan, actual, and the delay.",
        pointers: [
          "A job or batch has a plan, an actual, and the delay in hours or days.",
          "Each step has one person, not a department.",
          "Waiting on material, a machine, or a decision is visible.",
          "Staff update from the phone. The sheet stays the record.",
          "A late step alerts that person. The customer is not messaged.",
        ],
      },
      {
        id: "inventory",
        title: "Inventory",
        summary: "What you have, what a job still needs, and what is about to run out.",
        pointers: [
          "In, out, and balance for the items this business actually fights over.",
          "What is short before a job or a dispatch can start.",
          "A reorder line, and who is told when stock crosses it.",
          "Paper stock and floor stock can be checked against each other.",
          "The meeting shows the breaches, not every SKU.",
        ],
      },
      {
        id: "dispatch",
        title: "Dispatch",
        summary: "What is ready to leave, what went, and what the customer is still waiting for.",
        pointers: [
          "What is ready to leave, and what is still on the floor.",
          "Challan, vehicle, and what actually went out.",
          "What the customer is still waiting for, with a name on it.",
          "A late dispatch is a miss, including one that was completed late.",
          "You open one Site and see dispatch gaps next to sales, production, and stock.",
        ],
      },
    ],
    phases: [],
  },
  {
    id: "WORKING_PROFESSIONAL",
    name: "Working Professionals",
    eyebrow: "Learn to build it",
    promise:
      "You type. Shyam teaches you to make an FMS, an IMS, a person-wise deficit, and a checklist — in Google Sheets, AppSheet, and Apps Script — and to use AI as a junior you check, not a source you trust.",
    priceInr: 25_000,
    advanceInr: 12_500,
    totalClasses: 20,
    sessionDurationMin: 90,
    sessionDurationLabel: "1.5 hours",
    sessionTimeIst: "08:30",
    sessionTimeLabel: "8:30–10:00 AM IST",
    totalHours: 30,
    weeksLabel: "about 10 weeks",
    tools: "Google Sheets, AppSheet, and Apps Script. Looker Studio only for the owner page.",
    classRhythm:
      "About 15 minutes on the skill, about 60 minutes making it yourself, and about 15 minutes on how to do the same job faster next time.",
    terms: [
      ...sharedTerms,
      "Scope is these 20 classes and the four builds: FMS, IMS, PMS, and checklist. A full company system for your employer is the Business Owners course, or a separate project.",
      "You bring a Google account you can put a practice file in. AI drafts. You test on a copy before anything goes live.",
    ],
    phases: [
      phase(
        "wp-before",
        "Before you build",
        "Classes 1–4",
        "You learn what an owner will ask, and where an AI answer is pretty and wrong.",
        [
          cls(1, "What the owner will ask, and where AI lies", "Refuse an answer that names no person, date, or row."),
          cls(2, "Read the work before you prompt", "A flow on paper that a prompt is not allowed to rearrange."),
          cls(3, "A sheet structure you can defend", "Tabs with jobs. Columns you can explain in one sentence."),
          cls(4, "Planned, actual, delay, deficit", "A gap shown as a minus. On time adds nothing."),
        ],
      ),
      phase(
        "wp-fms",
        "FMS",
        "Classes 5–8",
        "One flow, with an owner, a plan, an actual, and a delay.",
        [
          cls(5, "The FMS tracker", "Step, owner, planned, actual, status, delay."),
          cls(6, "Entry that staff will not break", "Dropdowns, a required plan, and protection on the formulas."),
          cls(7, "Apps Script, on a copy", "A script you have read, run on sample rows, with nothing deleted."),
          cls(8, "The late nudge", "One message to the person who owns the step. Not to a customer."),
        ],
      ),
      phase(
        "wp-ops",
        "IMS, PMS, checklist",
        "Classes 9–12",
        "Stock, the person-wise gap, and a list that is either done on time or a miss.",
        [
          cls(9, "IMS: in, out, balance", "Opening plus in minus out, checked against a hand count."),
          cls(10, "The reorder breach", "A short list of items at or below the line."),
          cls(11, "PMS across the work", "Pending, overdue, and done late as a deficit. Not percent complete."),
          cls(12, "The checklist", "Item, owner, time. A late tick is still a miss."),
        ],
      ),
      phase(
        "wp-app",
        "AppSheet",
        "Classes 13–16",
        "The same files, on a phone, without a second set of numbers.",
        [
          cls(13, "The FMS on the phone", "Open steps and a form that writes the actual time."),
          cls(14, "Expressions you can read", "Late, and only my steps, tested with two logins."),
          cls(15, "A bot that does not spam", "One nudge. The other ideas written down as noise."),
          cls(16, "IMS or the checklist on the phone", "Stock in and out, or a tick that still shows a late miss."),
        ],
      ),
      phase(
        "wp-leave",
        "The owner page, and the next skill",
        "Classes 17–20",
        "A page an owner can start from, a pack you can hand over, and a way to learn the next piece.",
        [
          cls(17, "The page they open", "Delays, breaches, misses, and the deficit. Exceptions first."),
          cls(18, "Prove it", "Five numbers, each traced to rows."),
          cls(19, "The pack", "The files and a note a new joiner can follow."),
          cls(20, "The next skill", "Ask, read, test on a copy, keep only what the sheet confirms."),
        ],
      ),
    ],
  },
];

export function getCourseProgram(id: string): CourseProgram | null {
  return coursePrograms.find((program) => program.id === id) ?? null;
}

export function isCourseProgramId(value: string): value is CourseProgramId {
  return value === "BUSINESS_OWNER" || value === "WORKING_PROFESSIONAL";
}
