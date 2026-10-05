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
    eyebrow: "Your business, built in class",
    promise:
      "Shyam builds one live flow on your data — sheet, phone app, and a weekly view you can open without someone compiling a report. The last part of each class teaches the method only if you want to build the next piece yourself.",
    priceInr: 110_000,
    advanceInr: 55_000,
    totalClasses: 30,
    sessionDurationMin: 120,
    sessionDurationLabel: "2 hours",
    sessionTimeIst: "08:30",
    sessionTimeLabel: "8:30–10:30 AM IST",
    totalHours: 60,
    weeksLabel: "about 15 weeks",
    tools: "Google Sheets, AppSheet, and Looker Studio. Workspace is optional after the program.",
    classRhythm:
      "About 20 minutes on what broke since last class, about 70 minutes building on your file, and about 30 minutes on the method — only if you want to repeat it yourself.",
    terms: [
      ...sharedTerms,
      "Scope is these 30 classes and the one flow locked in class 6. A second company or a large extra build is a new quote.",
      "You bring access, data, and one person who does the work. If that is late, the dates move.",
    ],
    phases: [
      phase(
        "bo-see",
        "See the business",
        "Classes 1–6",
        "These six classes do not change with the industry. They decide what the other twenty-four will build.",
        [
          cls(1, "The meeting you will run", "The weekly meeting, written in your words."),
          cls(2, "The flow that is costing you", "One flow chosen. The rest parked."),
          cls(3, "Who owns the step", "A single name on every step."),
          cls(4, "Planned, actual, delay", "Ten real jobs that already show the gap."),
          cls(5, "The deficit", "A person-wise minus for one week, not a completion percent."),
          cls(6, "The system we will finish", "A one-page scope. Classes 7–30 follow it."),
        ],
      ),
      phase(
        "bo-sheet",
        "The sheet, on your flow",
        "Classes 7–14",
        "The subject is the flow from class 6. The method is the same for the next flow you may build alone.",
        [
          cls(7, "One source of truth", "One named file. Everything else is a copy."),
          cls(8, "Masters and daily work", "Real customers and items, and an empty daily tab."),
          cls(9, "Formulas the owner can read", "Each formula explained in a sentence before it stays."),
          cls(10, "The live tracker", "Your recent jobs, with owner, plan, actual, and delay."),
          cls(11, "Status, owner, due time", "Statuses your staff will recognise on Monday."),
          cls(12, "Entry a non-technical person can do", "Dropdowns and a path a new joiner can use."),
          cls(13, "Lock what must not break", "Staff can add rows. They cannot wipe the structure."),
          cls(14, "Sheet review on real numbers", "Five live jobs until the sheet matches the shop."),
        ],
      ),
      phase(
        "bo-app",
        "The phone app, on the same flow",
        "Classes 15–22",
        "Staff will not keep the sheet alive if updating it means opening a laptop.",
        [
          cls(15, "First screen from their sheet", "Today’s open steps, on your phone."),
          cls(16, "The one form people will fill", "Step, person, and time. Extra fields wait."),
          cls(17, "Proof", "Photo or note only where the business actually argues."),
          cls(18, "Who sees what", "You see the flow. Each person sees their own steps."),
          cls(19, "A nudge when it is late", "One alert to the staff member. Nothing to the customer."),
          cls(20, "The main flow on the phone", "One job type that runs without the sheet open."),
          cls(21, "The second flow, only if class 6 allowed it", "A thin second flow, or a stronger first one."),
          cls(22, "A staff member uses it", "Someone other than you has entered a real step."),
        ],
      ),
      phase(
        "bo-week",
        "The weekly view",
        "Classes 23–28",
        "The sheet and the app can be busy and still leave you blind. These classes make the meeting possible.",
        [
          cls(23, "Five numbers", "Five figures, and the decision each one supports."),
          cls(24, "Looker on a stable range", "A page that opens on your numbers."),
          cls(25, "Exceptions first", "Overdue, pending, and short — not every row."),
          cls(26, "Person-wise", "The gap by person. On time stays quiet."),
          cls(27, "A mock meeting", "You run one short review on live rows."),
          cls(28, "When the page and the sheet disagree", "The sheet stays the truth until they match."),
        ],
      ),
      phase(
        "bo-leave",
        "Leave it running",
        "Classes 29–30",
        "The system has to survive the week after the last class.",
        [
          cls(29, "You build the next small piece", "You add one real thing while Shyam watches."),
          cls(30, "The next 30 days", "The weekly slot, the five numbers, and the one flow you will not start yet."),
        ],
      ),
    ],
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
