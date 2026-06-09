import type { LegalCase } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import { buildLegalListWhere } from "@/lib/legal-cases/queries";
import {
  hasSectionField,
  parseAmount,
  sectionField,
  sectionFieldMatches,
} from "@/lib/legal-cases/section-data";
import type { LegalViewKey } from "@/lib/legal-cases/views";

const VIEW_PAGE_SIZE = 100;

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

function filterViewCases(
  cases: LegalCase[],
  viewKey: LegalViewKey,
  category?: string,
): LegalCase[] {
  let rows = cases.filter((item) => matchesCategory(item, category ?? ""));

  switch (viewKey) {
    case "running":
      rows = rows.filter((item) => item.fileStatus?.toUpperCase() === "RUNNING");
      break;
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

  return rows;
}

export async function listLegalViewCases(
  user: SessionUser,
  viewKey: LegalViewKey,
  options: { category?: string; page?: number } = {},
) {
  const page = Math.max(1, options.page ?? 1);

  const baseWhere = buildLegalListWhere(user, {
    mineOnly: !isLegalAdmin(user),
  });

  const cases = await prisma.legalCase.findMany({
    where: baseWhere,
    orderBy: [{ fileNumber: "asc" }, { mccNumber: "asc" }],
  });

  const filtered = filterViewCases(cases, viewKey, options.category);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / VIEW_PAGE_SIZE));
  const items = filtered.slice((page - 1) * VIEW_PAGE_SIZE, page * VIEW_PAGE_SIZE);

  return { items, total, page, totalPages, pageSize: VIEW_PAGE_SIZE };
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
  const where = buildLegalListWhere(user, { mineOnly: !isLegalAdmin(user) });
  const rows = await prisma.legalCase.findMany({
    where,
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows
    .map((row) => row.category?.trim())
    .filter((value): value is string => Boolean(value));
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
