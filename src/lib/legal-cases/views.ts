import type { LegalCase } from "@prisma/client";
import { sectionField } from "@/lib/legal-cases/section-data";

export type LegalViewKey =
  | "all"
  | "running"
  | "as-due"
  | "diary"
  | "order-deposits"
  | "simple-fracture"
  | "new-cases";

export type LegalViewColumn = {
  key: string;
  label: string;
  getValue: (legalCase: LegalCase, index: number) => string;
  className?: string;
};

export type LegalViewDefinition = {
  key: LegalViewKey;
  label: string;
  description: string;
  categoryFilter?: boolean;
};

const col =
  (label: string, getValue: LegalViewColumn["getValue"]): LegalViewColumn => ({
    key: label,
    label,
    getValue,
  });

const scalar =
  (label: string, field: keyof LegalCase): LegalViewColumn =>
    col(label, (c) => String(c[field] ?? ""));

const extra = (label: string): LegalViewColumn =>
  col(label, (c) => sectionField(c, label));

const sec2 = (): LegalViewColumn =>
  col("Sec 2", (c) => c.s2Responsible ?? "");

export const LEGAL_VIEWS: LegalViewDefinition[] = [
  {
    key: "all",
    label: "All cases",
    description: "Complete case register with search and filters.",
    categoryFilter: true,
  },
  {
    key: "running",
    label: "Running",
    description: "Active RUNNING files with document readiness insights.",
    categoryFilter: true,
  },
  {
    key: "as-due",
    label: "AS due (1 Apr)",
    description: "Agreement status AS due - cases pending agreement signing.",
    categoryFilter: true,
  },
  {
    key: "diary",
    label: "Diary",
    description: "Hearing diary sorted by next date.",
    categoryFilter: true,
  },
  {
    key: "order-deposits",
    label: "Order + Deposits",
    description: "Orders and deposit cases sorted by amount (high to low).",
    categoryFilter: true,
  },
  {
    key: "simple-fracture",
    label: "Simple fracture (Abhishek)",
    description: "Simple fracture list for Abhishek assignee.",
    categoryFilter: false,
  },
  {
    key: "new-cases",
    label: "New cases (BD)",
    description: "Cases to be filed - BD team queue.",
    categoryFilter: false,
  },
];

export function legalViewByKey(key: string): LegalViewDefinition | undefined {
  return LEGAL_VIEWS.find((view) => view.key === key);
}

export function legalViewColumns(key: LegalViewKey): LegalViewColumn[] {
  switch (key) {
    case "as-due":
      return [
        col("S.No", (_c, i) => String(i + 1)),
        scalar("File No.", "fileNumber"),
        scalar("Case Category", "category"),
        scalar("Applicant", "applicant"),
        scalar("Non Applicant", "nonApplicant"),
        extra("CONTACT NO."),
        scalar("Case Stage", "caseStage"),
        extra("LA STATUS"),
        extra("AGREEMENT"),
        extra("ORDER DATE"),
        extra("AMOUNT"),
        extra("SBI A/C NO."),
        extra("CHEQUE BK"),
      ];
    case "diary":
      return [
        sec2(),
        scalar("Next date", "nextDate"),
        col("F.No", (c) => c.fNo ?? c.fileNumber),
        scalar("F-No", "fNo"),
        scalar("Court", "court"),
        scalar("Case Stage", "caseStage"),
        scalar("AMD & CC Status", "amdCcStatus"),
        scalar("MCC NO", "mccNumber"),
        scalar("Case Category", "category"),
        scalar("Applicant", "applicant"),
        scalar("Non Applicant", "nonApplicant"),
        scalar("Company", "company"),
        scalar("Co. Advocate", "coAdvocate"),
        extra("PDC STATUS"),
        extra("CC DATE"),
        col("Person Responsible", (c) => c.s2Responsible ?? ""),
        scalar("Remark (Requirements)/ Proposals", "remarks"),
      ];
    case "order-deposits":
    case "simple-fracture":
      return [
        sec2(),
        col("F.No", (c) => c.fileNumber),
        scalar("MCC NO", "mccNumber"),
        scalar("Case Category", "category"),
        scalar("Applicant", "applicant"),
        scalar("Non Applicant", "nonApplicant"),
        scalar("Prev Date", "prevDate"),
        scalar("Next date", "nextDate"),
        scalar("Case Stage", "caseStage"),
        scalar("AMD & CC Status", "amdCcStatus"),
        scalar("F-No", "fNo"),
        scalar("Court", "court"),
        scalar("Co. Advocate", "coAdvocate"),
        scalar("Company", "company"),
        extra("LA STATUS"),
        extra("AGREEMENT"),
        extra("ORDER DATE"),
        extra("AMOUNT"),
        extra("CO. FILE NO."),
        extra("VOUCHER/ UTR NO."),
        extra("VOUCHER DT."),
        extra("BANK NAME"),
        extra("SBI A/C NO."),
        extra("CHEQUE BK"),
        extra("CONTACT NO."),
      ];
    case "new-cases":
      return [
        col("S.No", (_c, i) => String(i + 1)),
        scalar("File No.", "fileNumber"),
        col("F/I", (c) => c.caseFiled ?? ""),
        scalar("Applicant", "applicant"),
        scalar("Non Applicant", "nonApplicant"),
        extra("DECEASED"),
        extra("DATE OF ACCIDENT/ FIR"),
        extra("THANA"),
        extra("FIELD"),
        scalar("STATUS", "fileStatus"),
        extra("ACCOUNT"),
        scalar("Remark (Requirements)/ Proposals", "remarks"),
      ];
    default:
      return [];
  }
}

export function legalViewPath(key: LegalViewKey) {
  return key === "all" ? "/app/cases/list" : `/app/cases/views/${key}`;
}
