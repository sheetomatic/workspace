import type { TrainingTrackId } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CatalogLesson = {
  slug: string;
  title: string;
  moduleLabel: string;
  summary: string;
  published?: boolean;
};

export type CatalogCourse = {
  track: TrainingTrackId;
  title: string;
  summary: string;
  sortOrder: number;
  lessons: CatalogLesson[];
};

export function slugifyLessonTitle(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

const SHEETS_LESSONS: Array<{
  no: number;
  module: string;
  title: string;
  summary: string;
  ready?: boolean;
}> = [
  { no: 1, module: "Overview", title: "Google Sheets session overview", summary: "How this 1:1 Sheets track is structured — basics to advanced.", ready: true },
  { no: 2, module: "Getting started", title: "Creating a new spreadsheet", summary: "Start a blank sheet, rename tabs, and set up your first file.", ready: true },
  { no: 3, module: "Getting started", title: "Importing data (CSV, Excel)", summary: "Bring existing files into Google Sheets without breaking columns.", ready: true },
  { no: 4, module: "Getting started", title: "Exporting data (PDF, Excel, CSV)", summary: "Download or share a snapshot for clients and offline use.", ready: true },
  { no: 5, module: "Getting started", title: "Publish as a webpage", summary: "Publish a sheet or range as a live web page.", ready: true },
  { no: 6, module: "Beginners", title: "Enable keyboard shortcuts", summary: "Speed up everyday editing with Sheets shortcuts." },
  { no: 7, module: "Beginners", title: "Hide, group, and ungroup", summary: "Keep large sheets readable without deleting data." },
  { no: 8, module: "Beginners", title: "Protect sheets and ranges", summary: "Lock formulas and allow teammates to edit only the right cells." },
  { no: 9, module: "Beginners", title: "Filter and filter views", summary: "Personal views that do not break a shared sheet." },
  { no: 10, module: "Beginners", title: "Data cleanup suggestions", summary: "Trim spaces, split columns, and fix messy imports." },
  { no: 11, module: "Beginners", title: "Data validation", summary: "Dropdowns and rules so data stays clean." },
  { no: 12, module: "Beginners", title: "Notification rules", summary: "Email alerts when a shared sheet changes." },
  { no: 13, module: "Beginners", title: "Comments and notes", summary: "Collaborate without overwriting someone else's work." },
  { no: 14, module: "Beginners", title: "Using Google Sheets offline", summary: "Edit without internet and sync later." },
  { no: 15, module: "Beginners", title: "Advanced sharing settings", summary: "Viewer, commenter, editor, and link sharing." },
  { no: 16, module: "Intermediate", title: "CONCATENATE and TEXTJOIN", summary: "Combine names, addresses, and labels into one cell." },
  { no: 17, module: "Intermediate", title: "COUNT, COUNTA, COUNTBLANK", summary: "Count numbers, filled cells, and empty cells." },
  { no: 18, module: "Intermediate", title: "LEN", summary: "Measure text length — useful for IDs and validation." },
  { no: 19, module: "Intermediate", title: "TRIM", summary: "Remove extra spaces from imported data." },
  { no: 20, module: "Intermediate", title: "SUBSTITUTE", summary: "Replace text inside a cell without breaking the rest." },
  { no: 21, module: "Intermediate", title: "UPPER, LOWER, PROPER", summary: "Standardize names and titles." },
  { no: 22, module: "Intermediate", title: "TODAY", summary: "Always-current date for ageing and follow-ups." },
  { no: 23, module: "Intermediate", title: "NOW", summary: "Timestamp formulas for logs." },
  { no: 24, module: "Intermediate", title: "DATE, MONTH, YEAR", summary: "Pull parts of a date for reports." },
  { no: 25, module: "Intermediate", title: "DATEDIF", summary: "Age, tenure, and days between two dates." },
  { no: 26, module: "Intermediate", title: "DAYS", summary: "Simple day difference between two dates." },
  { no: 27, module: "Advanced", title: "Conditional formatting basics", summary: "Highlight overdue, blanks, and targets automatically." },
  { no: 28, module: "Advanced", title: "Copy a sheet to another spreadsheet", summary: "Move a template tab into a live client file." },
  { no: 29, module: "Advanced", title: "Convert data into a table", summary: "Structured ranges that stay tidy as rows grow." },
  { no: 30, module: "Advanced", title: "SPLIT and INDEX", summary: "Break one cell into columns and pick a position." },
  { no: 31, module: "Advanced", title: "VLOOKUP", summary: "Look up a value from another table." },
  { no: 32, module: "Advanced", title: "HLOOKUP", summary: "Lookup across a header row." },
  { no: 33, module: "Advanced", title: "VLOOKUP with wildcards", summary: "Partial matches when IDs are not exact." },
  { no: 34, module: "Advanced", title: "INDEX and MATCH", summary: "Flexible lookup that is not stuck on the first column." },
  { no: 35, module: "Advanced", title: "XLOOKUP", summary: "Modern lookup — left, right, and exact/approx." },
  { no: 36, module: "Advanced", title: "ARRAYFORMULA", summary: "One formula that fills a whole column." },
  { no: 37, module: "Advanced", title: "VLOOKUP from different workbooks", summary: "Pull from another spreadsheet with IMPORTRANGE." },
  { no: 38, module: "Advanced", title: "FILTER formula", summary: "Live filtered lists without pivot tables." },
  { no: 39, module: "Advanced", title: "Dependent dropdowns", summary: "Second dropdown changes based on the first." },
  { no: 40, module: "Advanced", title: "QUERY function", summary: "SQL-like filters and summaries inside Sheets." },
  { no: 41, module: "Advanced", title: "IFERROR and IFNA", summary: "Clean #N/A and #DIV/0! from client-facing sheets." },
  { no: 42, module: "Advanced", title: "OR", summary: "True if any condition matches." },
  { no: 43, module: "Advanced", title: "AND", summary: "True only if every condition matches." },
  { no: 44, module: "Advanced", title: "IF", summary: "Branch a result based on one condition." },
  { no: 45, module: "Advanced", title: "IFS", summary: "Multiple conditions without nested IFs." },
  { no: 46, module: "Advanced", title: "IF-OR and IF-AND", summary: "Combine logic for real business rules." },
  { no: 47, module: "Advanced", title: "SUMIF and SUMIFS", summary: "Conditional totals for sales and expenses." },
  { no: 48, module: "Advanced", title: "COUNTIF and COUNTIFS", summary: "Conditional counts for status and categories." },
  { no: 49, module: "Advanced", title: "GOOGLEFINANCE", summary: "Live market data inside a sheet." },
  { no: 50, module: "Advanced", title: "SPARKLINE", summary: "Mini charts inside a cell." },
  { no: 51, module: "Data & visuals", title: "Pivot tables", summary: "Summarize large data without writing formulas." },
  { no: 52, module: "Data & visuals", title: "Calculated fields in pivots", summary: "Custom math on top of a pivot." },
  { no: 53, module: "Data & visuals", title: "Charts", summary: "Pick the right chart and keep it client-ready." },
  { no: 54, module: "Data & visuals", title: "Slicers", summary: "Click-to-filter dashboards in Sheets." },
  { no: 55, module: "Forms", title: "Google Forms", summary: "Build a form that captures clean lead or ops data." },
  { no: 56, module: "Forms", title: "Connect a form to Sheets", summary: "Responses land in a sheet you can report on." },
  { no: 57, module: "Add-ons", title: "Form Mule — email merge", summary: "Send personalized emails from a sheet." },
  { no: 58, module: "Add-ons", title: "Form notifications", summary: "Alert the team when a new response arrives." },
];

const APPSHEET_LESSONS: CatalogLesson[] = [
  { slug: "overview", title: "AppSheet overview", moduleLabel: "Basics", summary: "What AppSheet is and when to use it instead of a sheet-only workflow." },
  { slug: "data-sources", title: "Connect Google Sheets as the database", moduleLabel: "Basics", summary: "One table per tab, keys, and how AppSheet reads your sheet." },
  { slug: "tables-columns", title: "Tables, columns, and types", moduleLabel: "Basics", summary: "Text, number, enum, image, lat-long, and ref columns." },
  { slug: "views", title: "Views — form, table, deck, map", moduleLabel: "Basics", summary: "How users see and enter data on phone and desktop." },
  { slug: "actions", title: "Actions and automation", moduleLabel: "Intermediate", summary: "Buttons, bots, and email/WhatsApp-style notifications." },
  { slug: "security", title: "Security filters and roles", moduleLabel: "Intermediate", summary: "Each user sees only their rows." },
  { slug: "project-field", title: "Project — field operations app", moduleLabel: "Projects", summary: "Build a check-in / job card app from a live sheet." },
  { slug: "project-inventory", title: "Project — inventory app", moduleLabel: "Projects", summary: "Stock in/out with a simple AppSheet front end." },
];

const LOOKER_LESSONS: CatalogLesson[] = [
  { slug: "overview", title: "Looker Studio (Data Studio) overview", moduleLabel: "Basics", summary: "What a dashboard is for — and what it is not." },
  { slug: "connectors", title: "Connect Google Sheets", moduleLabel: "Basics", summary: "Link the sheet you already use as the data source." },
  { slug: "charts", title: "Charts and scorecards", moduleLabel: "Basics", summary: "KPI tiles, time series, tables, and pie/bar charts." },
  { slug: "controls", title: "Filters, date range, and controls", moduleLabel: "Intermediate", summary: "Let the client slice the same dashboard by month or city." },
  { slug: "calculated", title: "Calculated fields", moduleLabel: "Intermediate", summary: "Ratios, labels, and CASE logic inside Looker." },
  { slug: "layout", title: "Dashboard layout and branding", moduleLabel: "Design", summary: "Grid, theme, logos, and a page that looks finished." },
  { slug: "share", title: "Share, schedule, and embed", moduleLabel: "Features", summary: "Viewer links, email schedules, and embed in a site." },
  { slug: "project-dashboard", title: "Project — business dashboard", moduleLabel: "Projects", summary: "Ship one live dashboard from your training sheet." },
];

export const LEARN_CATALOG: CatalogCourse[] = [
  {
    track: "SHEETS",
    title: "Google Sheets — basics to advanced",
    summary:
      "From a blank spreadsheet to lookups, QUERY, pivots, Forms, and add-ons. Curriculum from the Sheetomatic training sheet.",
    sortOrder: 1,
    lessons: SHEETS_LESSONS.map((item) => ({
      slug: slugifyLessonTitle(item.title, `lesson-${item.no}`),
      title: `${item.no}. ${item.title}`,
      moduleLabel: item.module,
      summary: item.summary,
      published: true,
    })),
  },
  {
    track: "APPSHEET",
    title: "AppSheet — basics to advanced + projects",
    summary:
      "Turn a Google Sheet into a phone app. Tables, views, actions, security, then two guided projects.",
    sortOrder: 2,
    lessons: APPSHEET_LESSONS,
  },
  {
    track: "LOOKER",
    title: "Looker Studio — dashboards & features",
    summary:
      "Google Data Studio / Looker Studio: connectors, charts, filters, calculated fields, branding, and sharing.",
    sortOrder: 3,
    lessons: LOOKER_LESSONS,
  },
];

export const TRACK_LABEL: Record<TrainingTrackId, string> = {
  SHEETS: "Google Sheets",
  APPSHEET: "AppSheet",
  LOOKER: "Looker Studio",
};

export function parseTrainingTrack(value: string | undefined): TrainingTrackId | null {
  const key = value?.trim().toUpperCase();
  if (key === "SHEETS" || key === "APPSHEET" || key === "LOOKER") {
    return key;
  }
  return null;
}

export async function ensureTrainingCatalog() {
  const existing = await prisma.trainingCourse.findFirst({
    where: { track: "SHEETS" },
    include: { _count: { select: { lessons: true } } },
  });
  if (existing && existing._count.lessons >= 50) {
    return;
  }

  for (const course of LEARN_CATALOG) {
    const saved = await prisma.trainingCourse.upsert({
      where: { track: course.track },
      create: {
        track: course.track,
        title: course.title,
        summary: course.summary,
        sortOrder: course.sortOrder,
        published: true,
      },
      update: {
        title: course.title,
        summary: course.summary,
        sortOrder: course.sortOrder,
        published: true,
      },
    });

    for (const [index, lesson] of course.lessons.entries()) {
      await prisma.trainingLesson.upsert({
        where: {
          courseId_slug: { courseId: saved.id, slug: lesson.slug },
        },
        create: {
          courseId: saved.id,
          slug: lesson.slug,
          title: lesson.title,
          moduleLabel: lesson.moduleLabel,
          summary: lesson.summary,
          bodyMd: "",
          sortOrder: index + 1,
          published: lesson.published !== false,
        },
        update: {
          title: lesson.title,
          moduleLabel: lesson.moduleLabel,
          summary: lesson.summary,
          sortOrder: index + 1,
        },
      });
    }
  }
}

export async function listPublishedCourses() {
  await ensureTrainingCatalog();
  return prisma.trainingCourse.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
    include: {
      lessons: {
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          moduleLabel: true,
          summary: true,
          sortOrder: true,
          goal: true,
          practicePrompt: true,
          bodyMd: true,
          videoUrl: true,
          embedUrl: true,
        },
      },
    },
  });
}

export async function getPublishedCourse(track: TrainingTrackId) {
  await ensureTrainingCatalog();
  return prisma.trainingCourse.findFirst({
    where: { track, published: true },
    include: {
      lessons: {
        where: { published: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function getPublishedLesson(track: TrainingTrackId, slug: string) {
  const course = await getPublishedCourse(track);
  if (!course) return null;
  const lesson = course.lessons.find((item) => item.slug === slug) ?? null;
  if (!lesson) return null;
  return { course, lesson, lessons: course.lessons };
}

/** Full curriculum for the trainer editor, including unpublished lessons. */
export async function listTrainingCurriculum() {
  await ensureTrainingCatalog();
  return prisma.trainingCourse.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}
