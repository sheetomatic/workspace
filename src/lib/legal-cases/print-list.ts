import type { LegalCase } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import {
  intakeDeceased,
  intakeDoa,
  intakeFieldStaff,
  intakeThana,
} from "@/lib/legal-cases/intake-fields";
import { sectionField } from "@/lib/legal-cases/section-data";
import { listAllLegalViewCases } from "@/lib/legal-cases/view-queries";
import {
  legalViewColumns,
  type LegalViewKey,
} from "@/lib/legal-cases/views";
import { needsPublicationAlert } from "@/lib/legal-cases/intake-fields";

export type PrintListColumnKey =
  | "tot"
  | "sno"
  | "fileNo"
  | "fi"
  | "applicant"
  | "nonApplicant"
  | "deceased"
  | "doa"
  | "thana"
  | "field"
  | "status"
  | "comp"
  | "account"
  | "remark";

export type PrintListColumn = {
  key: PrintListColumnKey;
  label: string;
  className?: string;
};

export const PRINT_LIST_COLUMNS: PrintListColumn[] = [
  { key: "tot", label: "Tot", className: "lp-col-num" },
  { key: "sno", label: "S.No", className: "lp-col-num" },
  { key: "fileNo", label: "File No.", className: "lp-col-file" },
  { key: "fi", label: "F/I", className: "lp-col-fi" },
  { key: "applicant", label: "Applicant" },
  { key: "nonApplicant", label: "Non Applicant" },
  { key: "deceased", label: "Deceased" },
  { key: "doa", label: "DOA", className: "lp-col-date" },
  { key: "thana", label: "Thana" },
  { key: "field", label: "Field", className: "lp-col-field" },
  { key: "status", label: "Status", className: "lp-col-status" },
  { key: "comp", label: "Comp", className: "lp-col-fi" },
  { key: "account", label: "Account", className: "lp-col-fi" },
  { key: "remark", label: "Remark" },
];

export type PrintStatusKey =
  | "to-be-filed"
  | "papers-pending"
  | "plaint-due"
  | "filed";

type SectionDefinition = {
  key: PrintStatusKey;
  title: string;
};

const SECTION_DEFINITIONS: SectionDefinition[] = [
  { key: "to-be-filed", title: "Cases to be filed" },
  { key: "papers-pending", title: "Papers pending" },
  { key: "plaint-due", title: "Plaint due" },
  { key: "filed", title: "Filed" },
];

export type PrintListSortKey = "field" | "file" | "doa";

export type PrintListRow = {
  id: string;
  statusKey: PrintStatusKey;
  cells: Record<PrintListColumnKey, string>;
};

export type PrintListSection = {
  key: PrintStatusKey;
  title: string;
  rows: PrintListRow[];
};

export type PrintListResult = {
  columns: PrintListColumn[];
  sections: PrintListSection[];
  total: number;
  asOfLabel: string;
};

function classifyStatus(legalCase: LegalCase): PrintStatusKey {
  const status = (legalCase.fileStatus ?? "").toUpperCase();
  const stage = (legalCase.caseStage ?? "").toUpperCase();
  const remark = (legalCase.remarks ?? "").toUpperCase();

  if (status.includes("FILED") && !status.includes("TO BE")) {
    return "filed";
  }
  if (
    status.includes("PLAINT") ||
    stage.includes("PLAINT") ||
    remark.includes("PLAINT DUE")
  ) {
    return "plaint-due";
  }
  if (
    status.includes("PAPER") ||
    stage.includes("PAPER") ||
    remark.includes("PAPER")
  ) {
    return "papers-pending";
  }
  return "to-be-filed";
}

function fieldValue(legalCase: LegalCase): string {
  return intakeFieldStaff(legalCase);
}

function doaValue(legalCase: LegalCase): string {
  return intakeDoa(legalCase);
}

function compareBySort(
  a: LegalCase,
  b: LegalCase,
  sort: PrintListSortKey,
): number {
  if (sort === "file") {
    return (a.fileNumber ?? "").localeCompare(b.fileNumber ?? "", undefined, {
      numeric: true,
    });
  }
  if (sort === "doa") {
    return doaValue(a).localeCompare(doaValue(b), undefined, { numeric: true });
  }
  const byField = fieldValue(a).localeCompare(fieldValue(b), undefined, {
    sensitivity: "base",
  });
  if (byField !== 0) {
    return byField;
  }
  return (a.fileNumber ?? "").localeCompare(b.fileNumber ?? "", undefined, {
    numeric: true,
  });
}

function toCells(
  legalCase: LegalCase,
  tot: number,
  sno: number,
): Record<PrintListColumnKey, string> {
  return {
    tot: String(tot),
    sno: String(sno),
    fileNo: legalCase.fileNumber ?? "",
    fi: legalCase.caseFiled ?? "",
    applicant: legalCase.applicant ?? "",
    nonApplicant: legalCase.nonApplicant ?? "",
    deceased: intakeDeceased(legalCase),
    doa: doaValue(legalCase),
    thana: intakeThana(legalCase),
    field: fieldValue(legalCase),
    status: legalCase.fileStatus ?? "",
    comp: sectionField(legalCase, "COMP"),
    account: sectionField(legalCase, "ACCOUNT"),
    remark: legalCase.remarks ?? "",
  };
}

export function formatAsOfLabel(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = date
    .toLocaleString("en-US", { month: "short" })
    .toUpperCase();
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export type BuildPrintListOptions = {
  sort?: PrintListSortKey;
  asOf?: Date;
};

export async function buildToBeFiledPrintList(
  user: SessionUser,
  options: BuildPrintListOptions = {},
): Promise<PrintListResult> {
  const sort = options.sort ?? "field";
  const cases = await listAllLegalViewCases(user, "new-cases");

  const grouped = new Map<PrintStatusKey, LegalCase[]>();
  for (const legalCase of cases) {
    const key = classifyStatus(legalCase);
    const bucket = grouped.get(key) ?? [];
    bucket.push(legalCase);
    grouped.set(key, bucket);
  }

  let tot = 0;
  const sections: PrintListSection[] = [];

  for (const definition of SECTION_DEFINITIONS) {
    const bucket = grouped.get(definition.key);
    if (!bucket || bucket.length === 0) {
      continue;
    }
    const sorted = [...bucket].sort((a, b) => compareBySort(a, b, sort));
    const rows: PrintListRow[] = sorted.map((legalCase, index) => {
      tot += 1;
      return {
        id: legalCase.id,
        statusKey: definition.key,
        cells: toCells(legalCase, tot, index + 1),
      };
    });
    sections.push({ key: definition.key, title: definition.title, rows });
  }

  return {
    columns: PRINT_LIST_COLUMNS,
    sections,
    total: tot,
    asOfLabel: formatAsOfLabel(options.asOf ?? new Date()),
  };
}

export type ViewPrintRow = {
  id: string;
  cells: string[];
  highlight?: "no-show" | "publication";
};

export type ViewPrintResult = {
  title: string;
  columns: string[];
  rows: ViewPrintRow[];
  total: number;
  asOfLabel: string;
};

export async function buildViewPrintList(
  user: SessionUser,
  viewKey: Extract<LegalViewKey, "diary" | "statement">,
  options: BuildPrintListOptions = {},
): Promise<ViewPrintResult> {
  const cases = await listAllLegalViewCases(user, viewKey);
  const columns = legalViewColumns(viewKey).map((column) => column.label);

  const rows: ViewPrintRow[] = cases.map((legalCase, index) => {
    const viewColumns = legalViewColumns(viewKey);
    const cells = viewColumns.map((column) => column.getValue(legalCase, index));
    let highlight: ViewPrintRow["highlight"];
    if (needsPublicationAlert(legalCase.amdCcStatus)) {
      highlight = "publication";
    } else if (/\b[BCDE]\b/.test((legalCase.amdCcStatus ?? "").toUpperCase())) {
      highlight = "no-show";
    }
    return { id: legalCase.id, cells, highlight };
  });

  const title =
    viewKey === "diary"
      ? "COURT DIARY (HINGORANI CHAMBER)"
      : "STATEMENT / WS / EVI DIARY (HINGORANI CHAMBER)";

  return {
    title,
    columns,
    rows,
    total: rows.length,
    asOfLabel: formatAsOfLabel(options.asOf ?? new Date()),
  };
}
