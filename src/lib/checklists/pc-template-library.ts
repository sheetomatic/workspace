/**
 * AI Process Checklist (PC) template library - department starters and reference links.
 */

export const PC_SAMPLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1N4CdRzXlix-tWVqynyXgcPBIXyc_Ac2o79thwhGc96I/edit?usp=sharing";

export type ChecklistReferenceKind = "web" | "youtube" | "shared";

export type ChecklistReference = {
  id: string;
  kind: ChecklistReferenceKind;
  label: string;
  href: string;
  note?: string;
};

export type ChecklistItem = {
  id: string;
  order: number;
  activity: string;
  frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly";
  ownerRole: string;
  proof: string;
  tat?: string;
};

export type PcLibraryTemplate = {
  id: string;
  category: string;
  name: string;
  summary: string;
  references: ChecklistReference[];
  items: ChecklistItem[];
};

export const PC_GLOBAL_REFERENCES: ChecklistReference[] = [
  {
    id: "sheetomatic-ai",
    kind: "web",
    label: "Sheetomatic AI",
    href: "https://sheetomatic.com",
    note: "Native PC runs with timestamps, proof, and EM deficit scoring",
  },
  {
    id: "em-ready",
    kind: "web",
    label: "EM Ready guide",
    href: "https://sheetomatic.com/app/em",
    note: "Weekly executive meeting with person-wise KRA deficit",
  },
  {
    id: "pc-youtube",
    kind: "youtube",
    label: "Process checklist systems",
    href: "https://www.youtube.com/results?search_query=process+checklist+operations",
    note: "FMS, PC, IMS, and weekly review concepts",
  },
  {
    id: "mis-automation",
    kind: "youtube",
    label: "MIS automation overview",
    href: "https://www.youtube.com/results?search_query=mis+performance+management",
    note: "Monitor employee performance with numbers, not opinions",
  },
  {
    id: "pc-sample-sheet",
    kind: "shared",
    label: "PC sample layout (Google Sheet)",
    href: PC_SAMPLE_SHEET_URL,
    note: "Reference template for checklist structure",
  },
];

export const PC_LIBRARY_TEMPLATES: PcLibraryTemplate[] = [
  {
    id: "weekly-em-discipline",
    category: "Executive",
    name: "Weekly EM and office discipline",
    summary:
      "Owner/reviewer prep for weekly executive meeting - exceptions only, person-wise KRA deficit.",
    references: [
      {
        id: "em-youtube",
        kind: "youtube",
        label: "Weekly review culture",
        href: "https://www.youtube.com/results?search_query=weekly+business+review+meeting",
      },
      {
        id: "em-sheet",
        kind: "shared",
        label: "EM tracker sample",
        href: PC_SAMPLE_SHEET_URL,
      },
    ],
    items: [
      {
        id: "em-1",
        order: 1,
        activity: "Pull overdue tasks and delayed FMS stops for the week",
        frequency: "Weekly",
        ownerRole: "Owner / EA",
        proof: "EM Ready board screenshot or exception list",
        tat: "Before Monday EM",
      },
      {
        id: "em-2",
        order: 2,
        activity: "Review person-wise KRA deficit % (not % done)",
        frequency: "Weekly",
        ownerRole: "Owner",
        proof: "Person-wise table signed off",
        tat: "During EM",
      },
      {
        id: "em-3",
        order: 3,
        activity: "Assign owners for unassigned FMS stops",
        frequency: "Weekly",
        ownerRole: "Department head",
        proof: "Owner name updated in system",
        tat: "Same day",
      },
      {
        id: "em-4",
        order: 4,
        activity: "Capture action items with doer + due date",
        frequency: "Weekly",
        ownerRole: "Owner / EA",
        proof: "Delegated tasks created",
        tat: "End of EM",
      },
    ],
  },
  {
    id: "accounts-month-end",
    category: "Accounts",
    name: "Month-end accounts discipline",
    summary: "GST, collections, and payment follow-up checklist for finance team.",
    references: [
      {
        id: "acc-web",
        kind: "web",
        label: "MIS number system",
        href: "https://sheetomatic.com",
        note: "Monitor performance with numbers, not opinions",
      },
      {
        id: "acc-sheet",
        kind: "shared",
        label: "Accounts PC sample",
        href: PC_SAMPLE_SHEET_URL,
      },
    ],
    items: [
      {
        id: "acc-1",
        order: 1,
        activity: "Reconcile bank statement with books",
        frequency: "Monthly",
        ownerRole: "Accounts executive",
        proof: "Signed reconciliation sheet",
        tat: "By 3rd of month",
      },
      {
        id: "acc-2",
        order: 2,
        activity: "Follow up on overdue receivables (FMS collection stops)",
        frequency: "Weekly",
        ownerRole: "Accounts / Sales",
        proof: "Call log or WhatsApp proof",
        tat: "Every Friday",
      },
      {
        id: "acc-3",
        order: 3,
        activity: "GST return readiness check",
        frequency: "Monthly",
        ownerRole: "Accounts head",
        proof: "Checklist tick + filing ack",
        tat: "Before due date",
      },
      {
        id: "acc-4",
        order: 4,
        activity: "Vendor payment run approved by owner",
        frequency: "Weekly",
        ownerRole: "Accounts head",
        proof: "Approval trail",
        tat: "As per credit terms",
      },
    ],
  },
  {
    id: "plant-maintenance",
    category: "Maintenance",
    name: "Plant and equipment round",
    summary: "Daily/weekly facility checks with photo proof for maintenance team.",
    references: [
      {
        id: "maint-youtube",
        kind: "youtube",
        label: "Process checklist overview",
        href: "https://www.youtube.com/results?search_query=preventive+maintenance+checklist",
      },
      {
        id: "maint-sheet",
        kind: "shared",
        label: "Maintenance PC sample",
        href: PC_SAMPLE_SHEET_URL,
      },
    ],
    items: [
      {
        id: "maint-1",
        order: 1,
        activity: "Fire extinguisher and safety signage check",
        frequency: "Weekly",
        ownerRole: "Maintenance supervisor",
        proof: "Photo at each point",
        tat: "Monday morning",
      },
      {
        id: "maint-2",
        order: 2,
        activity: "Generator / UPS test log",
        frequency: "Weekly",
        ownerRole: "Electrician",
        proof: "Running hours log",
        tat: "Wednesday",
      },
      {
        id: "maint-3",
        order: 3,
        activity: "Compressed air / HVAC filter inspection",
        frequency: "Monthly",
        ownerRole: "Maintenance team",
        proof: "Before/after photo",
        tat: "1st week of month",
      },
      {
        id: "maint-4",
        order: 4,
        activity: "Escalate breakdowns blocking dispatch FMS",
        frequency: "Daily",
        ownerRole: "Shift in-charge",
        proof: "Ticket + owner assigned",
        tat: "Within 2 hours",
      },
    ],
  },
  {
    id: "hr-onboarding",
    category: "HR",
    name: "Employee onboarding PC",
    summary: "Document checklist and policy compliance for new joiners.",
    references: [
      {
        id: "hr-web",
        kind: "web",
        label: "Accountability structure",
        href: "https://sheetomatic.com",
      },
      {
        id: "hr-sheet",
        kind: "shared",
        label: "HR onboarding PC sample",
        href: PC_SAMPLE_SHEET_URL,
      },
    ],
    items: [
      {
        id: "hr-1",
        order: 1,
        activity: "Collect KYC, bank, and emergency contact",
        frequency: "Daily",
        ownerRole: "HR executive",
        proof: "Scanned docs uploaded",
        tat: "Day 1",
      },
      {
        id: "hr-2",
        order: 2,
        activity: "Issue ID card and system login",
        frequency: "Daily",
        ownerRole: "HR / IT",
        proof: "Login confirmation",
        tat: "Day 2",
      },
      {
        id: "hr-3",
        order: 3,
        activity: "Explain KRA/KPI and weekly review rhythm",
        frequency: "Daily",
        ownerRole: "Department head",
        proof: "Signed acknowledgement",
        tat: "Week 1",
      },
      {
        id: "hr-4",
        order: 4,
        activity: "Attendance and field policy briefing",
        frequency: "Daily",
        ownerRole: "HR",
        proof: "Policy checklist tick",
        tat: "Day 1",
      },
    ],
  },
  {
    id: "sales-follow-up",
    category: "Sales",
    name: "Lead follow-up discipline",
    summary: "Daily sales PC aligned with Lead-to-Closure FMS stops.",
    references: [
      {
        id: "sales-web",
        kind: "web",
        label: "FMS for on-time collection",
        href: "https://sheetomatic.com/app/fms",
      },
      {
        id: "sales-sheet",
        kind: "shared",
        label: "Sales PC sample",
        href: PC_SAMPLE_SHEET_URL,
      },
    ],
    items: [
      {
        id: "sales-1",
        order: 1,
        activity: "Call all leads due for follow-up today",
        frequency: "Daily",
        ownerRole: "Sales executive",
        proof: "CRM note or FMS step update",
        tat: "By 6 PM",
      },
      {
        id: "sales-2",
        order: 2,
        activity: "Update pipeline stage in FMS (no orphan leads)",
        frequency: "Daily",
        ownerRole: "Sales executive",
        proof: "FMS instance current",
        tat: "Same day",
      },
      {
        id: "sales-3",
        order: 3,
        activity: "Share weekly conversion summary with owner",
        frequency: "Weekly",
        ownerRole: "Sales head",
        proof: "MIS numbers shared",
        tat: "Friday EOD",
      },
    ],
  },
];

export function listPcLibraryCategories() {
  return [...new Set(PC_LIBRARY_TEMPLATES.map((template) => template.category))];
}
