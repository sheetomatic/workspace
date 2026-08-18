/** Official Sheets TOC + hidden practice tabs (student-facing, already public). */
export const LEARN_PRACTICE_WORKBOOK_ID =
  "1oi3yFs23QolphwKCjUY3mV8Ab3B7v2StN5EwYcefK4A";

/** Trainer working copy the class is taught from. Same tabs; share Viewer if students use this id. */
export const LEARN_PRACTICE_WORKBOOK_WORKING_ID =
  "1J_mQBLCGWgTj3g5x2HDykV1LIhS-dZF65GRCjoElNz4";

export const LEARN_PRACTICE_TOC_GID = "1166833090";

export function learnPracticeWorkbookUrl(gid?: string | null) {
  const id = LEARN_PRACTICE_WORKBOOK_ID;
  const sheet = gid?.trim() || LEARN_PRACTICE_TOC_GID;
  return `https://docs.google.com/spreadsheets/d/${id}/edit?usp=sharing&gid=${sheet}#gid=${sheet}`;
}

export function learnPracticeCopyUrl() {
  return `https://docs.google.com/spreadsheets/d/${LEARN_PRACTICE_WORKBOOK_ID}/copy`;
}

export function learnPracticePreviewUrl(gid?: string | null) {
  const id = LEARN_PRACTICE_WORKBOOK_ID;
  const sheet = gid?.trim() || LEARN_PRACTICE_TOC_GID;
  return `https://docs.google.com/spreadsheets/d/${id}/preview?gid=${sheet}`;
}

/** Hidden (and a few visible) tabs in the official practice workbook. */
export const PRACTICE_TABS = [
  "Google Sheets Session",
  "RawData",
  "Sparkline",
  "Google Finance",
  "Hlookup",
  "Filter",
  "Query Basics",
  "Query",
  "DATE functions",
  "DATEDIF | EOMONTH",
  "Data Values",
  "Filter | Filter View",
  "EQ | NE | LT |LE |GT |GE",
  "Protect | Lock",
  "Hide | Group",
  "Data Validation | Drop Downs",
  "Setting",
  "Depended Drop Down",
  "Advanced_ Filter",
  "Data Clean Up",
  "LEN | TRIM",
  "Basic Calculations",
  "COUNTS",
  "RAND | RANDBETWEEN",
  "ROUND | UP | DOWN",
  "CONCATENATE | TEXT_JOIN",
  "SUBSTITUTE|L|U|P",
  "IF Statements",
  "AND | OR (IF(AND(OR))",
  "Split | Index",
  "Countif",
  "Arrayformula + Vlookup",
  "Importrange + Vlookup",
  "Index + Match",
  "Error Handeling",
  "Conditional Formatting",
  "IndexMatch",
  "XLOOKUP",
  "VLOOKUP",
  "Sumif",
  "Countifs",
  "Sumifs",
  "Pivot Table | Slicers",
  "Advanced Conditional Formatting",
] as const;

export type PracticeTabName = (typeof PRACTICE_TABS)[number];
