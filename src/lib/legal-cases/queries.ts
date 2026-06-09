import type { LegalCase, Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  LEGAL_SECTION_LABELS,
  SECTION_RESPONSIBLE_FIELD,
  type LegalSectionNumber,
} from "@/lib/legal-cases/constants";
import {
  hasTrackableNextDate,
  trackableNextDateWhere,
} from "@/lib/legal-cases/next-date";
import {
  canViewLegalCase,
  canViewLegalSection,
  isLegalAdmin,
  normalizeStaffCode,
  userStaffCode,
} from "@/lib/legal-cases/access";

const WORK_SECTIONS = [2, 3, 4, 5, 6, 7] as const;
type WorkSectionNumber = (typeof WORK_SECTIONS)[number];

function isWorkSection(section: LegalSectionNumber): section is WorkSectionNumber {
  return WORK_SECTIONS.includes(section as WorkSectionNumber);
}

export type LegalListMetric = "running" | "closed" | "appeal" | "hearings";

function sectionHasAssigneeWhere(
  section: WorkSectionNumber,
): Prisma.LegalCaseWhereInput {
  const field = SECTION_RESPONSIBLE_FIELD[section];
  return {
    AND: [
      { [field]: { not: null } },
      { NOT: { [field]: { equals: "", mode: "insensitive" } } },
    ],
  };
}

function sectionResponsibleWhere(
  section: LegalSectionNumber,
  code: string,
): Prisma.LegalCaseWhereInput {
  switch (section) {
    case 2:
      return { s2Responsible: { equals: code, mode: "insensitive" } };
    case 3:
      return { s3Responsible: { equals: code, mode: "insensitive" } };
    case 4:
      return { s4Responsible: { equals: code, mode: "insensitive" } };
    case 5:
      return { s5Responsible: { equals: code, mode: "insensitive" } };
    case 6:
      return { s6Responsible: { equals: code, mode: "insensitive" } };
    case 7:
      return { s7Responsible: { equals: code, mode: "insensitive" } };
    default:
      return { id: "__none__" };
  }
}

export type LegalCaseListFilter = {
  q?: string;
  fileStatus?: string;
  caseStage?: string;
  mineOnly?: boolean;
  assignee?: string;
  section?: WorkSectionNumber;
  metric?: LegalListMetric;
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 25;

function buildCaseRef(fileNumber: string, mccNumber?: string | null) {
  const file = fileNumber.trim();
  const mcc = mccNumber?.trim();
  return mcc ? `${file}:${mcc}` : file;
}

function doerWhere(user: SessionUser): Prisma.LegalCaseWhereInput {
  const code = userStaffCode(user);
  if (!code) {
    return { id: "__none__" };
  }
  return {
    OR: [
      { s2Responsible: { equals: code, mode: "insensitive" } },
      { s3Responsible: { equals: code, mode: "insensitive" } },
      { s4Responsible: { equals: code, mode: "insensitive" } },
      { s5Responsible: { equals: code, mode: "insensitive" } },
      { s6Responsible: { equals: code, mode: "insensitive" } },
      { s7Responsible: { equals: code, mode: "insensitive" } },
    ],
  };
}

export function buildLegalListWhere(
  user: SessionUser,
  filter: LegalCaseListFilter,
): Prisma.LegalCaseWhereInput {
  const clauses: Prisma.LegalCaseWhereInput[] = [];

  if (!isLegalAdmin(user) || filter.mineOnly) {
    clauses.push(doerWhere(user));
  }

  if (filter.fileStatus) {
    clauses.push({ fileStatus: filter.fileStatus });
  }

  if (filter.caseStage) {
    clauses.push({ caseStage: filter.caseStage });
  }

  if (filter.metric === "running") {
    clauses.push({ fileStatus: "RUNNING" });
  } else if (filter.metric === "closed") {
    clauses.push({ fileStatus: "CLOSED" });
  } else if (filter.metric === "appeal") {
    clauses.push({ fileStatus: "APPEAL FILED" });
  } else if (filter.metric === "hearings") {
    clauses.push(trackableNextDateWhere());
  }

  const assigneeCode = filter.assignee
    ? normalizeStaffCode(filter.assignee)
    : null;
  const section = filter.section;

  if (assigneeCode) {
    if (section && isWorkSection(section)) {
      clauses.push(sectionResponsibleWhere(section, assigneeCode));
    } else {
      clauses.push({
        OR: WORK_SECTIONS.map((item) =>
          sectionResponsibleWhere(item, assigneeCode),
        ),
      });
    }
  } else if (section && isWorkSection(section)) {
    if (isLegalAdmin(user)) {
      clauses.push(sectionHasAssigneeWhere(section));
    } else {
      const code = userStaffCode(user);
      if (code) {
        clauses.push(sectionResponsibleWhere(section, code));
      }
    }
  }

  const q = filter.q?.trim();
  if (q) {
    clauses.push({
      OR: [
        { fileNumber: { contains: q, mode: "insensitive" } },
        { mccNumber: { contains: q, mode: "insensitive" } },
        { caseRef: { contains: q, mode: "insensitive" } },
        { applicant: { contains: q, mode: "insensitive" } },
        { nonApplicant: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { court: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  return {
    organizationId: user.organizationId,
    ...(clauses.length > 0 ? { AND: clauses } : {}),
  };
}

export async function listLegalCases(
  user: SessionUser,
  filter: LegalCaseListFilter = {},
) {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = filter.pageSize ?? DEFAULT_PAGE_SIZE;
  const where = buildLegalListWhere(user, filter);

  const [items, total] = await Promise.all([
    prisma.legalCase.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { fileNumber: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { documents: true } },
      },
    }),
    prisma.legalCase.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getLegalCaseForUser(user: SessionUser, caseId: string) {
  const legalCase = await prisma.legalCase.findFirst({
    where: { id: caseId, organizationId: user.organizationId },
    include: {
      documents: {
        orderBy: [{ section: "asc" }, { category: "asc" }, { createdAt: "desc" }],
        include: {
          uploadedBy: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!legalCase || !canViewLegalCase(user, legalCase)) {
    return null;
  }

  if (!isLegalAdmin(user)) {
    legalCase.documents = legalCase.documents.filter((doc) =>
      canViewLegalSection(user, legalCase, doc.section as LegalSectionNumber),
    );
  }

  return legalCase;
}

export type AssigneeCountRow = {
  code: string;
  caseCount: number;
  sectionCounts: { section: LegalSectionNumber; label: string; count: number }[];
};

export type LegalDashboardStats = {
  visibleTotal: number;
  totalCases: number;
  myCases: number;
  mySectionCounts: { section: LegalSectionNumber; label: string; count: number }[];
  running: number;
  closed: number;
  appealFiled: number;
  hearingsSoon: number;
  recentCases: Pick<
    LegalCase,
    | "id"
    | "fileNumber"
    | "mccNumber"
    | "caseRef"
    | "applicant"
    | "fileStatus"
    | "caseStage"
    | "nextDate"
    | "court"
    | "s2Responsible"
    | "s3Responsible"
    | "s4Responsible"
    | "s5Responsible"
    | "s6Responsible"
    | "s7Responsible"
  >[];
  statusBreakdown: { label: string; count: number }[];
  stageBreakdown: { label: string; count: number }[];
  sectionBreakdown: { section: LegalSectionNumber; label: string; count: number }[];
  assigneeBreakdown: AssigneeCountRow[];
  assigneeCaseTotal: number;
};

async function buildAssigneeBreakdown(organizationId: string) {
  const cases = await prisma.legalCase.findMany({
    where: { organizationId },
    select: {
      id: true,
      s2Responsible: true,
      s3Responsible: true,
      s4Responsible: true,
      s5Responsible: true,
      s6Responsible: true,
      s7Responsible: true,
    },
  });

  const indexByCode = new Map<string, AssigneeCountRow>();
  let casesWithAssignee = 0;

  for (const legalCase of cases) {
    const codesOnCase = new Set<string>();
    for (const section of WORK_SECTIONS) {
      const field = `s${section}Responsible` as keyof typeof legalCase;
      const code = normalizeStaffCode(legalCase[field] as string | null);
      if (!code) {
        continue;
      }
      codesOnCase.add(code);

      let row = indexByCode.get(code);
      if (!row) {
        row = {
          code,
          caseCount: 0,
          sectionCounts: WORK_SECTIONS.map((item) => ({
            section: item,
            label: LEGAL_SECTION_LABELS[item],
            count: 0,
          })),
        };
        indexByCode.set(code, row);
      }

      const sectionRow = row.sectionCounts.find((item) => item.section === section);
      if (sectionRow) {
        sectionRow.count += 1;
      }
    }

    if (codesOnCase.size > 0) {
      casesWithAssignee += 1;
    }

    for (const code of codesOnCase) {
      const row = indexByCode.get(code);
      if (row) {
        row.caseCount += 1;
      }
    }
  }

  const rows = [...indexByCode.values()].sort((a, b) => b.caseCount - a.caseCount);
  return { rows, total: casesWithAssignee };
}

async function buildSectionBreakdown(organizationId: string) {
  const counts = await Promise.all(
    WORK_SECTIONS.map((section) =>
      prisma.legalCase.count({
        where: {
          organizationId,
          AND: [sectionHasAssigneeWhere(section)],
        },
      }),
    ),
  );

  return WORK_SECTIONS.map((section, index) => ({
    section,
    label: LEGAL_SECTION_LABELS[section],
    count: counts[index] ?? 0,
  }));
}

async function buildMySectionCounts(
  organizationId: string,
  code: string,
  { includeEmpty = false }: { includeEmpty?: boolean } = {},
) {
  const counts = await Promise.all(
    WORK_SECTIONS.map((section) =>
      prisma.legalCase.count({
        where: {
          organizationId,
          AND: [sectionResponsibleWhere(section, code)],
        },
      }),
    ),
  );

  const rows = WORK_SECTIONS.map((section, index) => ({
    section,
    label: LEGAL_SECTION_LABELS[section],
    count: counts[index] ?? 0,
  }));

  return includeEmpty ? rows : rows.filter((row) => row.count > 0);
}

export async function getLegalSectionCounts(user: SessionUser) {
  const orgId = user.organizationId;
  const admin = isLegalAdmin(user);
  const code = userStaffCode(user);

  if (admin) {
    const rows = await buildSectionBreakdown(orgId);
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return { rows, total, mode: "admin" as const };
  }

  if (!code) {
    return { rows: [], total: 0, mode: "doer" as const };
  }

  const rows = await buildMySectionCounts(orgId, code, { includeEmpty: true });
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return { rows, total, mode: "doer" as const };
}

export async function getLegalAssigneeCounts(user: SessionUser) {
  const orgId = user.organizationId;
  const admin = isLegalAdmin(user);
  const code = userStaffCode(user);

  if (admin) {
    const { rows: breakdown, total } = await buildAssigneeBreakdown(orgId);
    const rows = breakdown.map((row) => ({
      code: row.code,
      count: row.caseCount,
    }));
    return { rows, total, mode: "admin" as const };
  }

  if (!code) {
    return { rows: [], total: 0, mode: "doer" as const };
  }

  const count = await prisma.legalCase.count({
    where: { organizationId: orgId, AND: [doerWhere(user)] },
  });

  return {
    rows: count > 0 ? [{ code, count }] : [],
    total: count,
    mode: "doer" as const,
  };
}

export async function getLegalDashboardStats(
  user: SessionUser,
): Promise<LegalDashboardStats> {
  const orgId = user.organizationId;
  const admin = isLegalAdmin(user);
  const code = userStaffCode(user);

  const scopedWhere: Prisma.LegalCaseWhereInput = admin
    ? { organizationId: orgId }
    : { organizationId: orgId, AND: [doerWhere(user)] };

  const [
    totalCases,
    visibleTotal,
    myCases,
    running,
    closed,
    appealFiled,
    nextDateRows,
    recentCases,
    statuses,
    stages,
    assigneeSummary,
    sectionBreakdown,
    mySectionCounts,
  ] = await Promise.all([
    prisma.legalCase.count({ where: { organizationId: orgId } }),
    prisma.legalCase.count({ where: scopedWhere }),
    prisma.legalCase.count({
      where: { organizationId: orgId, AND: [doerWhere(user)] },
    }),
    prisma.legalCase.count({
      where: { ...scopedWhere, fileStatus: "RUNNING" },
    }),
    prisma.legalCase.count({
      where: { ...scopedWhere, fileStatus: "CLOSED" },
    }),
    prisma.legalCase.count({
      where: { ...scopedWhere, fileStatus: "APPEAL FILED" },
    }),
    prisma.legalCase.findMany({
      where: scopedWhere,
      select: { nextDate: true },
    }),
    prisma.legalCase.findMany({
      where: scopedWhere,
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        fileNumber: true,
        mccNumber: true,
        caseRef: true,
        applicant: true,
        fileStatus: true,
        caseStage: true,
        nextDate: true,
        court: true,
        s2Responsible: true,
        s3Responsible: true,
        s4Responsible: true,
        s5Responsible: true,
        s6Responsible: true,
        s7Responsible: true,
      },
    }),
    prisma.legalCase.groupBy({
      by: ["fileStatus"],
      where: scopedWhere,
      _count: { _all: true },
      orderBy: { _count: { fileStatus: "desc" } },
    }),
    prisma.legalCase.groupBy({
      by: ["caseStage"],
      where: scopedWhere,
      _count: { _all: true },
      orderBy: { _count: { caseStage: "desc" } },
    }),
    admin
      ? buildAssigneeBreakdown(orgId)
      : Promise.resolve({ rows: [] as AssigneeCountRow[], total: 0 }),
    admin ? buildSectionBreakdown(orgId) : Promise.resolve([]),
    !admin && code ? buildMySectionCounts(orgId, code) : Promise.resolve([]),
  ]);

  const hearingsSoon = nextDateRows.filter((row) =>
    hasTrackableNextDate(row.nextDate),
  ).length;

  return {
    visibleTotal,
    totalCases,
    myCases,
    mySectionCounts,
    running,
    closed,
    appealFiled,
    hearingsSoon,
    recentCases,
    statusBreakdown: statuses
      .filter((row) => row.fileStatus)
      .map((row) => ({
        label: row.fileStatus ?? "Unknown",
        count: row._count._all,
      })),
    stageBreakdown: stages
      .filter((row) => row.caseStage)
      .map((row) => ({
        label: row.caseStage ?? "Unknown",
        count: row._count._all,
      })),
    sectionBreakdown,
    assigneeBreakdown: assigneeSummary.rows,
    assigneeCaseTotal: assigneeSummary.total,
  };
}

export async function upsertLegalCaseFromImport(
  organizationId: string,
  input: {
    fileNumber: string;
    mccNumber?: string | null;
    applicant?: string | null;
    nonApplicant?: string | null;
    category?: string | null;
    caseStage?: string | null;
    fileStatus?: string | null;
    court?: string | null;
    company?: string | null;
    coAdvocate?: string | null;
    prevDate?: string | null;
    nextDate?: string | null;
    remarks?: string | null;
    amdCcStatus?: string | null;
    fNo?: string | null;
    s2Responsible?: string | null;
    s3Responsible?: string | null;
    s4Responsible?: string | null;
    s5Responsible?: string | null;
    s6Responsible?: string | null;
    s7Responsible?: string | null;
    sectionData?: Prisma.InputJsonValue;
  },
) {
  const caseRef = buildCaseRef(input.fileNumber, input.mccNumber);
  return prisma.legalCase.upsert({
    where: {
      organizationId_caseRef: {
        organizationId,
        caseRef,
      },
    },
    create: {
      organizationId,
      caseRef,
      fileNumber: input.fileNumber.trim(),
      mccNumber: input.mccNumber?.trim() || null,
      applicant: input.applicant?.trim() || null,
      nonApplicant: input.nonApplicant?.trim() || null,
      category: input.category?.trim() || null,
      caseStage: input.caseStage?.trim() || null,
      fileStatus: input.fileStatus?.trim() || null,
      court: input.court?.trim() || null,
      company: input.company?.trim() || null,
      coAdvocate: input.coAdvocate?.trim() || null,
      prevDate: input.prevDate?.trim() || null,
      nextDate: input.nextDate?.trim() || null,
      remarks: input.remarks?.trim() || null,
      amdCcStatus: input.amdCcStatus?.trim() || null,
      fNo: input.fNo?.trim() || null,
      s2Responsible: normalizeStaffCode(input.s2Responsible) || null,
      s3Responsible: normalizeStaffCode(input.s3Responsible) || null,
      s4Responsible: normalizeStaffCode(input.s4Responsible) || null,
      s5Responsible: normalizeStaffCode(input.s5Responsible) || null,
      s6Responsible: normalizeStaffCode(input.s6Responsible) || null,
      s7Responsible: normalizeStaffCode(input.s7Responsible) || null,
      sectionData: input.sectionData ?? {},
    },
    update: {
      applicant: input.applicant?.trim() || null,
      nonApplicant: input.nonApplicant?.trim() || null,
      category: input.category?.trim() || null,
      caseStage: input.caseStage?.trim() || null,
      fileStatus: input.fileStatus?.trim() || null,
      court: input.court?.trim() || null,
      company: input.company?.trim() || null,
      coAdvocate: input.coAdvocate?.trim() || null,
      prevDate: input.prevDate?.trim() || null,
      nextDate: input.nextDate?.trim() || null,
      remarks: input.remarks?.trim() || null,
      amdCcStatus: input.amdCcStatus?.trim() || null,
      fNo: input.fNo?.trim() || null,
      s2Responsible: normalizeStaffCode(input.s2Responsible) || null,
      s3Responsible: normalizeStaffCode(input.s3Responsible) || null,
      s4Responsible: normalizeStaffCode(input.s4Responsible) || null,
      s5Responsible: normalizeStaffCode(input.s5Responsible) || null,
      s6Responsible: normalizeStaffCode(input.s6Responsible) || null,
      s7Responsible: normalizeStaffCode(input.s7Responsible) || null,
      sectionData: input.sectionData ?? {},
    },
  });
}
