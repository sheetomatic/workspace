import type { ChecklistFrequency } from "@prisma/client";

/** Short frequency codes used in classic Accounts Checklists (M / Q / Y / HY). */
export type AccountsFreqCode = "M" | "Q" | "Y" | "HY";

export type AccountsChecklistParticular = {
  id: string;
  particular: string;
  freq: AccountsFreqCode;
  /** Day of month (M/Q) or display label for annual/half-yearly dates. */
  lastDateLabel: string;
  dueMonthDay?: number;
  dueMonth?: number;
  instructions?: string;
};

export type AccountsChecklistGroup = {
  id: string;
  accountabilityLabel: string;
  items: AccountsChecklistParticular[];
};

/** Classic accounts checklist layout (matches legacy Google Sheet / screenshot). */
export const ACCOUNTS_CHECKLIST_GROUPS: AccountsChecklistGroup[] = [
  {
    id: "accounts-primary",
    accountabilityLabel: "Accounts executive",
    items: [
      {
        id: "raise-invoice",
        particular: "Raise Invoice",
        freq: "M",
        lastDateLabel: "20",
        dueMonthDay: 20,
      },
      {
        id: "bill-payments",
        particular: "Bill Payments",
        freq: "M",
        lastDateLabel: "25",
        dueMonthDay: 25,
      },
      {
        id: "tds-tcs-payment",
        particular: "TDS/TCS Payment",
        freq: "M",
        lastDateLabel: "7",
        dueMonthDay: 7,
      },
      {
        id: "pf-return",
        particular: "PF Return",
        freq: "M",
        lastDateLabel: "15",
        dueMonthDay: 15,
      },
      {
        id: "gst-3b",
        particular: "GST Form - 3B",
        freq: "M",
        lastDateLabel: "20",
        dueMonthDay: 20,
      },
      {
        id: "gstr-1",
        particular: "GSTR-1",
        freq: "M",
        lastDateLabel: "11",
        dueMonthDay: 11,
      },
      {
        id: "gstr-2",
        particular: "GSTR-2",
        freq: "M",
        lastDateLabel: "15",
        dueMonthDay: 15,
      },
      {
        id: "bank-recon-1",
        particular: "Bank Reconciliations - Bank 1",
        freq: "M",
        lastDateLabel: "7",
        dueMonthDay: 7,
      },
      {
        id: "bank-recon-2",
        particular: "Bank Reconciliations - Bank 2",
        freq: "M",
        lastDateLabel: "15",
        dueMonthDay: 15,
      },
      {
        id: "send-tally",
        particular: "Send Tally data",
        freq: "M",
        lastDateLabel: "5",
        dueMonthDay: 5,
      },
      {
        id: "trial-balance",
        particular: "Finalise Trial Balance",
        freq: "M",
        lastDateLabel: "25",
        dueMonthDay: 25,
      },
      {
        id: "tds-deposit",
        particular: "TDS Deposit",
        freq: "M",
        lastDateLabel: "7",
        dueMonthDay: 7,
      },
    ],
  },
  {
    id: "accounts-compliance",
    accountabilityLabel: "Accounts head / CA",
    items: [
      {
        id: "income-tax-return",
        particular: "Income Tax Return",
        freq: "Y",
        lastDateLabel: "31-JUL, 30-SEP",
        dueMonth: 6,
        dueMonthDay: 31,
        instructions: "File before statutory due dates (July / September).",
      },
      {
        id: "advance-tax",
        particular: "Advance Tax Payment",
        freq: "Q",
        lastDateLabel: "15",
        dueMonthDay: 15,
      },
      {
        id: "income-tax-payment",
        particular: "Income Tax Payment",
        freq: "M",
        lastDateLabel: "15",
        dueMonthDay: 15,
      },
      {
        id: "esi-return",
        particular: "ESI Return",
        freq: "HY",
        lastDateLabel: "11-MAY, 11-NOV",
        dueMonth: 4,
        dueMonthDay: 11,
      },
      {
        id: "tds-quarterly",
        particular: "TDS Quarterly Return",
        freq: "Q",
        lastDateLabel: "31",
        dueMonthDay: 31,
      },
      {
        id: "gstr-3",
        particular: "GSTR-3",
        freq: "M",
        lastDateLabel: "20",
        dueMonthDay: 20,
      },
      {
        id: "gstr-9",
        particular: "GSTR-9",
        freq: "Y",
        lastDateLabel: "31-DEC",
        dueMonth: 11,
        dueMonthDay: 31,
      },
      {
        id: "balance-sheet",
        particular: "Finalise Balance Sheet",
        freq: "Y",
        lastDateLabel: "30-SEP",
        dueMonth: 8,
        dueMonthDay: 30,
      },
      {
        id: "deposit-income-tax",
        particular: "Deposit Income Tax",
        freq: "Y",
        lastDateLabel: "31-MAR",
        dueMonth: 2,
        dueMonthDay: 31,
      },
      {
        id: "file-balance-sheet",
        particular: "File / Collect Balance Sheet",
        freq: "Y",
        lastDateLabel: "30-SEP",
        dueMonth: 8,
        dueMonthDay: 30,
      },
    ],
  },
];

export const ACCOUNTS_FREQ_LABELS: Record<AccountsFreqCode, string> = {
  M: "Monthly",
  Q: "Quarterly",
  Y: "Yearly",
  HY: "Half-yearly",
};

export function accountsFreqToChecklistFrequency(
  freq: AccountsFreqCode,
): ChecklistFrequency {
  switch (freq) {
    case "M":
      return "MONTHLY";
    case "Q":
      return "QUARTERLY";
    case "Y":
      return "YEARLY";
    case "HY":
      return "HALF_YEARLY";
  }
}

export function flattenAccountsCatalog() {
  return ACCOUNTS_CHECKLIST_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ ...item, group })),
  );
}

export function checklistFrequencyToAccountsCode(
  frequency: ChecklistFrequency,
): AccountsFreqCode {
  switch (frequency) {
    case "MONTHLY":
      return "M";
    case "QUARTERLY":
      return "Q";
    case "YEARLY":
      return "Y";
    case "HALF_YEARLY":
      return "HY";
    case "WEEKLY":
    case "FORTNIGHTLY":
      return "M";
    default:
      return "M";
  }
}

export function formatLastDateLabel(
  frequency: ChecklistFrequency,
  dueMonthDay: number | null,
  dueMonth: number | null,
): string {
  if (frequency === "YEARLY" || frequency === "HALF_YEARLY") {
    if (dueMonth != null && dueMonthDay != null) {
      const months = [
        "JAN",
        "FEB",
        "MAR",
        "APR",
        "MAY",
        "JUN",
        "JUL",
        "AUG",
        "SEP",
        "OCT",
        "NOV",
        "DEC",
      ];
      return `${dueMonthDay}-${months[dueMonth] ?? "?"}`;
    }
    return dueMonthDay ? String(dueMonthDay) : "-";
  }
  return dueMonthDay ? String(dueMonthDay) : "-";
}
