import type { LegalCase } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  isAssignedToSection,
  isLegalAdmin,
  normalizeStaffCode,
  sectionResponsibleCode,
  userStaffCode,
} from "@/lib/legal-cases/access";
import { LEGAL_SECTION_LABELS } from "@/lib/legal-cases/constants";
import { buildLegalListWhere } from "@/lib/legal-cases/queries";
import {
  hasSectionField,
  parseAmount,
  sectionField,
  sectionFieldMatches,
} from "@/lib/legal-cases/section-data";
import { LEGAL_VIEWS, type LegalViewKey } from "@/lib/legal-cases/views";

const VIEW_PAGE_SIZE = 100;
const WORK_SECTIONS = [2, 3, 4, 5, 6, 7] as const;

export type LegalViewListFilter = {
  category?: string;
  assignee?: string;
  fileStatus?: string;
  caseStage?: string;
  section?: string;
  page?: number;
};

export type LegalViewFilterOptions = {
  categories: string[];
  assignees: string[];
  statuses: string[];
  stages: string[];
  sections: Array<{ value: string; label: string }>;
};

export type RunningInsights = {
  total: number;
  withDl: number;
  withDlVfn: number;
  withBankAccount: number;
  withChequeBook: number;
};

function matchesCategory(legalCase: LegalCase, category: string) {
  if (!category) return true;
  return (legalCase.category ?? "").toLowerCase() === category.toLowerCase();
}

function stageMatchesStatement(stage: string) {
  return /STATEMENT|STAT\s*DONE|PF|WS|EVI|ISSUES|PAPER\s*DUE|RESERVE/i.test(
    stage,
  );
}

function stageMatchesPfDue(stage: string) {
  return /\bPF\b|PF\s*OD|PF\s*COM|PF\s*DRIVER|PF\s*NOTICE/i.test(stage);
}

function assigneeMatches(legalCase: LegalCase, assignee?: string) {
  if (!assignee?.trim()) return true;
  const needle = assignee.trim().toUpperCase();
  const haystack = [
    legalCase.s2Responsible,
    legalCase.s3Responsible,
    legalCase.s4Responsible,
    legalCase.s5Responsible,
    legalCase.s6Responsible,
    legalCase.s7Responsible,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
  return haystack.includes(needle);
}

function sectionMatches(
  legalCase: LegalCase,
  section: string | undefined,
  context: { admin: boolean; staffCode: string },
) {
  if (!section?.trim()) return true;
  const sectionNum = Number(section);
  if (!WORK_SECTIONS.includes(sectionNum as (typeof WORK_SECTIONS)[number])) {
    return true;
  }
  const workSection = sectionNum as (typeof WORK_SECTIONS)[number];
  if (context.admin) {
    return Boolean(sectionResponsibleCode(legalCase, workSection));
  }
  if (!context.staffCode) return false;
  return isAssignedToSection(legalCase, workSection, context.staffCode);
}

function applyCommonViewFilters(
  rows: LegalCase[],
  options: LegalViewListFilter,
  context: { admin: boolean; staffCode: string },
): LegalCase[] {
  const assigneeCode = options.assignee?.trim()
    ? normalizeStaffCode(options.assignee)
    : null;
  const sectionNum = options.section?.trim() ? Number(options.section) : null;
  const hasWorkSection =
    sectionNum !== null &&
    WORK_SECTIONS.includes(sectionNum as (typeof WORK_SECTIONS)[number]);

  return rows.filter((item) => {
    if (options.fileStatus?.trim()) {
      if (
        (item.fileStatus ?? "").toUpperCase() !==
        options.fileStatus.trim().toUpperCase()
      ) {
        return false;
      }
    }
    if (options.caseStage?.trim()) {
      if ((item.caseStage ?? "").trim() !== options.caseStage.trim()) {
        return false;
      }
    }
    if (assigneeCode) {
      if (hasWorkSection) {
        if (
          !isAssignedToSection(
            item,
            sectionNum as (typeof WORK_SECTIONS)[number],
            assigneeCode,
          )
        ) {
          return false;
        }
      } else if (!assigneeMatches(item, options.assignee)) {
        return false;
      }
    } else if (hasWorkSection) {
      if (!sectionMatches(item, options.section, context)) {
        return false;
      }
    }
    return true;
  });
}

function filterViewCases(
  cases: LegalCase[],
  viewKey: LegalViewKey,
  options: LegalViewListFilter = {},
  context: { admin: boolean; staffCode: string } = { admin: true, staffCode: "" },
): LegalCase[] {
  let rows = cases.filter((item) => matchesCategory(item, options.category ?? ""));

  switch (viewKey) {
    case "as-due":
      rows = rows.filter((item) =>
        sectionFieldMatches(item, "AGREEMENT", /as\s*due/i),
      );
      break;
    case "diary":
      rows = rows.filter((item) => Boolean(item.nextDate?.trim()));
      rows.sort((a, b) =>
        (a.nextDate ?? "").localeCompare(b.nextDate ?? "", undefined, {
          numeric: true,
        }),
      );
      break;
    case "statement":
      rows = rows.filter((item) =>
        stageMatchesStatement(item.caseStage?.toUpperCase() ?? ""),
      );
      rows.sort((a, b) =>
        (a.nextDate ?? "").localeCompare(b.nextDate ?? "", undefined, {
          numeric: true,
        }),
      );
      break;
    case "pf-due":
      rows = rows.filter((item) =>
        stageMatchesPfDue(item.caseStage?.toUpperCase() ?? ""),
      );
      rows.sort((a, b) =>
        (a.nextDate ?? "").localeCompare(b.nextDate ?? "", undefined, {
          numeric: true,
        }),
      );
      break;
    case "order-deposits":
      rows = rows.filter((item) => {
        const stage = item.caseStage?.toUpperCase() ?? "";
        const status = item.fileStatus?.toUpperCase() ?? "";
        return (
          stage.includes("ORDER") ||
          stage.includes("DEPOSIT") ||
          status === "ORDER" ||
          Boolean(sectionField(item, "ORDER DATE")) ||
          parseAmount(sectionField(item, "AMOUNT")) > 0
        );
      });
      rows.sort(
        (a, b) =>
          parseAmount(sectionField(b, "AMOUNT")) -
          parseAmount(sectionField(a, "AMOUNT")),
      );
      break;
    case "simple-fracture":
      rows = rows.filter((item) => {
        const categoryValue = item.category?.toUpperCase() ?? "";
        const injury = sectionField(
          item,
          "INJURY DETAILS/ INCOME PROOF",
        ).toUpperCase();
        const isFracture =
          /FRACTURE|^F$|^SF$|^SI$|^I$/.test(categoryValue) ||
          injury.includes("FRACTURE");
        const assignees = [
          item.s2Responsible,
          item.s3Responsible,
          item.s4Responsible,
          item.s5Responsible,
          item.s6Responsible,
          item.s7Responsible,
        ]
          .filter(Boolean)
          .join(" ")
          .toUpperCase();
        return isFracture && assignees.includes("AT");
      });
      rows.sort(
        (a, b) =>
          parseAmount(sectionField(b, "AMOUNT")) -
          parseAmount(sectionField(a, "AMOUNT")),
      );
      break;
    case "new-cases":
      rows = rows.filter((item) => {
        const status = item.fileStatus?.toUpperCase() ?? "";
        const filed = item.caseFiled?.trim() ?? "";
        return (
          !filed ||
          status.includes("TO BE FILED") ||
          status.includes("NOT FILED") ||
          item.caseStage?.toUpperCase().includes("FILE")
        );
      });
      break;
    default:
      break;
  }

  rows = rows.filter((item) => item.fileStatus?.toUpperCase() === "RUNNING");

  return applyCommonViewFilters(rows, options, context);
}

export function buildLegalViewListQuery(
  filter: LegalViewListFilter,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.category) params.set("category", filter.category);
  if (filter.assignee) params.set("assignee", filter.assignee);
  if (filter.fileStatus) params.set("fileStatus", filter.fileStatus);
  if (filter.caseStage) params.set("caseStage", filter.caseStage);
  if (filter.section) params.set("section", filter.section);
  return params;
}

export async function listLegalViewCases(
  user: SessionUser,
  viewKey: LegalViewKey,
  options: LegalViewListFilter = {},
) {
  const page = Math.max(1, options.page ?? 1);
  const admin = isLegalAdmin(user);
  const staffCode = userStaffCode(user);

  const baseWhere = buildLegalListWhere(user, {
    mineOnly: !admin,
  });

  const cases = await prisma.legalCase.findMany({
    where: baseWhere,
    orderBy: [{ fileNumber: "asc" }, { mccNumber: "asc" }],
  });

  const filtered = filterViewCases(cases, viewKey, options, {
    admin,
    staffCode,
  });
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / VIEW_PAGE_SIZE));
  const items = filtered.slice((page - 1) * VIEW_PAGE_SIZE, page * VIEW_PAGE_SIZE);

  return { items, total, page, totalPages, pageSize: VIEW_PAGE_SIZE };
}

export async function listAllLegalViewCases(
  user: SessionUser,
  viewKey: LegalViewKey,
  options: LegalViewListFilter = {},
): Promise<LegalCase[]> {
  const admin = isLegalAdmin(user);
  const staffCode = userStaffCode(user);

  const baseWhere = buildLegalListWhere(user, {
    mineOnly: !admin,
  });

  const cases = await prisma.legalCase.findMany({
    where: baseWhere,
    orderBy: [{ fileNumber: "asc" }, { mccNumber: "asc" }],
  });

  return filterViewCases(cases, viewKey, options, { admin, staffCode });
}

export async function getRunningInsights(
  user: SessionUser,
): Promise<RunningInsights> {
  const where = buildLegalListWhere(user, {
    fileStatus: "RUNNING",
    mineOnly: !isLegalAdmin(user),
  });

  const cases = await prisma.legalCase.findMany({
    where,
    select: { sectionData: true },
  });

  return {
    total: cases.length,
    withDl: cases.filter(
      (item) =>
        hasSectionField(item, "LICENCE NO.") ||
        hasSectionField(item, "DECEASED LICENCE"),
    ).length,
    withDlVfn: cases.filter((item) => hasSectionField(item, "DL VFN")).length,
    withBankAccount: cases.filter((item) =>
      hasSectionField(item, "SBI A/C NO."),
    ).length,
    withChequeBook: cases.filter((item) => hasSectionField(item, "CHEQUE BK"))
      .length,
  };
}

export async function listLegalCategories(user: SessionUser) {
  const options = await getLegalViewFilterOptions(user);
  return options.categories;
}

export async function getLegalViewFilterOptions(
  user: SessionUser,
): Promise<LegalViewFilterOptions> {
  const where = buildLegalListWhere(user, {
    mineOnly: !isLegalAdmin(user),
  });

  const cases = await prisma.legalCase.findMany({
    where,
    select: {
      category: true,
      fileStatus: true,
      caseStage: true,
      s2Responsible: true,
      s3Responsible: true,
      s4Responsible: true,
      s5Responsible: true,
      s6Responsible: true,
      s7Responsible: true,
    },
  });

  const categories = new Set<string>();
  const statuses = new Set<string>();
  const stages = new Set<string>();
  const assignees = new Set<string>();

  for (const item of cases) {
    const category = item.category?.trim();
    if (category) categories.add(category);

    const status = item.fileStatus?.trim();
    if (status) statuses.add(status);

    const stage = item.caseStage?.trim();
    if (stage) stages.add(stage);

    for (const code of [
      item.s2Responsible,
      item.s3Responsible,
      item.s4Responsible,
      item.s5Responsible,
      item.s6Responsible,
      item.s7Responsible,
    ]) {
      const normalized = normalizeStaffCode(code);
      if (normalized) assignees.add(normalized);
    }
  }

  const sections = WORK_SECTIONS.map((section) => ({
    value: String(section),
    label: `S${section} · ${LEGAL_SECTION_LABELS[section]}`,
  }));

  const sortAlpha = (a: string, b: string) =>
    a.localeCompare(b, undefined, { sensitivity: "base" });

  return {
    categories: [...categories].sort(sortAlpha),
    assignees: [...assignees].sort(sortAlpha),
    statuses: [...statuses].sort(sortAlpha),
    stages: [...stages].sort(sortAlpha),
    sections,
  };
}

export async function countAllCases(user: SessionUser) {
  const where = buildLegalListWhere(user, { mineOnly: !isLegalAdmin(user) });
  return prisma.legalCase.count({ where });
}

export async function countRunningCases(user: SessionUser) {
  const where = buildLegalListWhere(user, {
    fileStatus: "RUNNING",
    mineOnly: !isLegalAdmin(user),
  });
  return prisma.legalCase.count({ where });
}

export type LegalViewNavCounts = Record<LegalViewKey, number>;

export async function getLegalViewNavCounts(
  user: SessionUser,
): Promise<LegalViewNavCounts> {
  const admin = isLegalAdmin(user);
  const staffCode = userStaffCode(user);
  const context = { admin, staffCode };

  const baseWhere = buildLegalListWhere(user, { mineOnly: !admin });
  const cases = await prisma.legalCase.findMany({ where: baseWhere });

  const counts = {} as LegalViewNavCounts;
  for (const view of LEGAL_VIEWS) {
    if (view.key === "all") {
      counts.all = cases.length;
    } else {
      counts[view.key] = filterViewCases(cases, view.key, {}, context).length;
    }
  }
  return counts;
}
