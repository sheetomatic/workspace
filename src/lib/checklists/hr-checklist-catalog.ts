import type { ChecklistFrequency } from "@prisma/client";

export type HrFocusId =
  | "onboarding"
  | "attendance"
  | "leave"
  | "policy";

export type HrChecklistParticular = {
  id: string;
  title: string;
  frequency: ChecklistFrequency;
  dueWeekday?: number;
  dueMonthDay?: number;
  ownerRole: string;
  instructions?: string;
  /** Match live templates/runs when filtering by tab. */
  keywords: string[];
};

export type HrChecklistGroup = {
  id: HrFocusId;
  label: string;
  description: string;
  items: HrChecklistParticular[];
};

/** Suggested HR Process Checklists — installable into Setup as live schedules. */
export const HR_CHECKLIST_GROUPS: HrChecklistGroup[] = [
  {
    id: "onboarding",
    label: "Onboarding & KYC",
    description: "Day-1 joiners — documents, access, and KRA briefing.",
    items: [
      {
        id: "hr-kyc-pack",
        title: "Collect KYC, bank, and emergency contact",
        frequency: "WEEKLY",
        dueWeekday: 1,
        ownerRole: "HR executive",
        instructions: "Scan and upload Aadhaar/PAN, cancelled cheque, and emergency contact form.",
        keywords: ["kyc", "bank", "emergency", "onboarding", "joiner"],
      },
      {
        id: "hr-access-id",
        title: "Issue ID card and system login",
        frequency: "WEEKLY",
        dueWeekday: 1,
        ownerRole: "HR / IT",
        instructions: "Confirm badge issued and workspace login works before Day 2 end.",
        keywords: ["id card", "login", "access", "system"],
      },
      {
        id: "hr-kra-brief",
        title: "Explain KRA/KPI and weekly review rhythm",
        frequency: "WEEKLY",
        dueWeekday: 2,
        ownerRole: "Department head",
        instructions: "Walk through person-wise KRA/KPI and EM deficit view; get signed acknowledgement.",
        keywords: ["kra", "kpi", "review", "onboarding"],
      },
    ],
  },
  {
    id: "attendance",
    label: "Attendance exceptions",
    description: "Exceptions-first — late, missing punch, and field attendance.",
    items: [
      {
        id: "hr-attendance-exceptions",
        title: "Review attendance exceptions for the week",
        frequency: "WEEKLY",
        dueWeekday: 5,
        ownerRole: "HR executive",
        instructions: "Close late / missing punch / geo exceptions before weekly EM.",
        keywords: ["attendance", "exception", "punch", "late", "missing"],
      },
      {
        id: "hr-field-policy",
        title: "Attendance and field policy briefing",
        frequency: "MONTHLY",
        dueMonthDay: 1,
        ownerRole: "HR",
        instructions: "Brief new joiners and field staff on punch rules and site geofence.",
        keywords: ["attendance", "field", "policy", "geofence"],
      },
    ],
  },
  {
    id: "leave",
    label: "Leave balances",
    description: "Balance accuracy and pending leave approvals before payroll.",
    items: [
      {
        id: "hr-leave-balances",
        title: "Reconcile leave balances vs approved requests",
        frequency: "MONTHLY",
        dueMonthDay: 25,
        ownerRole: "HR executive",
        instructions: "Match ledger balances to approved leave; flag deficits before payroll cut-off.",
        keywords: ["leave", "balance", "payroll", "approval"],
      },
      {
        id: "hr-leave-pending",
        title: "Chase pending leave approvals",
        frequency: "WEEKLY",
        dueWeekday: 3,
        ownerRole: "HR / Manager",
        instructions: "Nudge managers on open leave requests older than 48 hours.",
        keywords: ["leave", "pending", "approval"],
      },
    ],
  },
  {
    id: "policy",
    label: "Policy acknowledgement",
    description: "Handbook, POSH, and code-of-conduct acknowledgements on file.",
    items: [
      {
        id: "hr-policy-ack",
        title: "Collect policy acknowledgement for new joiners",
        frequency: "WEEKLY",
        dueWeekday: 4,
        ownerRole: "HR executive",
        instructions: "Handbook, POSH, and IT policy signed and filed in employee record.",
        keywords: ["policy", "acknowledgement", "handbook", "posh"],
      },
      {
        id: "hr-policy-annual",
        title: "Annual policy re-acknowledgement sweep",
        frequency: "YEARLY",
        dueMonthDay: 15,
        ownerRole: "HR head",
        instructions: "All active employees re-ack core policies; escalate non-responders.",
        keywords: ["policy", "annual", "acknowledgement"],
      },
    ],
  },
];

export function flattenHrCatalog() {
  return HR_CHECKLIST_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ ...item, group })),
  );
}

export function getHrFocusGroup(focusId: string | null | undefined) {
  if (!focusId) return null;
  return HR_CHECKLIST_GROUPS.find((group) => group.id === focusId) ?? null;
}

export function matchesHrFocus(
  text: string,
  focusId: HrFocusId | null | undefined,
): boolean {
  if (!focusId) return true;
  const group = getHrFocusGroup(focusId);
  if (!group) return true;
  const haystack = text.toLowerCase();
  return group.items.some((item) =>
    item.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())),
  );
}
