"use server";

import { revalidatePath } from "next/cache";
import type { LegalCase } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import {
  buildImportPreview,
  parseLegalCasesUpload,
} from "@/lib/legal-cases/file-import-export";
import {
  getLegalCaseImportBackupMeta,
  restoreLegalCasesBackup,
  snapshotLegalCasesBeforeImport,
} from "@/lib/legal-cases/import-backup";
import { replaceOrganizationLegalCases } from "@/lib/legal-cases/import-csv";
import type {
  LegalCaseSearchRow,
  LegalCasesSettingsState,
} from "@/app/app/cases/settings-types";

const SEARCH_RESULT_LIMIT = 25;

const CASE_SEARCH_SELECT = {
  id: true,
  fileNumber: true,
  mccNumber: true,
  applicant: true,
  nonApplicant: true,
  category: true,
  fileStatus: true,
  caseStage: true,
  court: true,
  company: true,
  coAdvocate: true,
  prevDate: true,
  nextDate: true,
  remarks: true,
  amdCcStatus: true,
  fNo: true,
  s2Responsible: true,
  s3Responsible: true,
  s4Responsible: true,
  s5Responsible: true,
  s6Responsible: true,
  s7Responsible: true,
} as const;

function toSearchRow(legalCase: {
  id: string;
  fileNumber: string;
  mccNumber: string | null;
  applicant: string | null;
  nonApplicant: string | null;
  category: string | null;
  fileStatus: string | null;
  caseStage: string | null;
  court: string | null;
  company: string | null;
  coAdvocate: string | null;
  prevDate: string | null;
  nextDate: string | null;
  remarks: string | null;
  amdCcStatus: string | null;
  fNo: string | null;
  s2Responsible: string | null;
  s3Responsible: string | null;
  s4Responsible: string | null;
  s5Responsible: string | null;
  s6Responsible: string | null;
  s7Responsible: string | null;
}): LegalCaseSearchRow {
  return legalCase;
}

function textField(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim() ?? "";
  return value || null;
}

async function requireLegalAdmin() {
  const user = await getSessionUser();
  if (!user || !isLegalAdmin(user)) {
    return null;
  }
  return user;
}

function revalidateCasesPaths() {
  revalidatePath("/app/cases");
  revalidatePath("/app/cases/list");
  revalidatePath("/app/cases/settings");
}

export async function loadLegalCasesSettingsBackupMeta() {
  const user = await requireLegalAdmin();
  if (!user) {
    return null;
  }
  return getLegalCaseImportBackupMeta(prisma, user.organizationId);
}

export async function previewLegalCasesImportAction(
  _prev: LegalCasesSettingsState,
  formData: FormData,
): Promise<LegalCasesSettingsState> {
  const user = await requireLegalAdmin();
  if (!user) {
    return { ok: false, message: "Only managers and admins can import cases." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, message: "Choose a CSV or Excel file." };
  }

  const headerRow = Number(formData.get("legalSheetHeaderRow") ?? 0);
  const currentCaseCount = Number(formData.get("currentCaseCount") ?? 0);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = buildImportPreview({
      buffer,
      filename: file.name,
      headerRow: headerRow > 0 ? headerRow : undefined,
      currentCaseCount,
    });

    return {
      ok: true,
      message: `Parsed ${preview.parsedCount.toLocaleString()} cases from ${preview.filename}.`,
      preview,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not preview the uploaded file.";
    return { ok: false, message };
  }
}

export async function confirmLegalCasesImportAction(
  _prev: LegalCasesSettingsState,
  formData: FormData,
): Promise<LegalCasesSettingsState> {
  const user = await requireLegalAdmin();
  if (!user) {
    return { ok: false, message: "Only managers and admins can import cases." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, message: "Choose a CSV or Excel file." };
  }

  const headerRow = Number(formData.get("legalSheetHeaderRow") ?? 0);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { parsed, headerRow: resolvedHeaderRow } = parseLegalCasesUpload({
      buffer,
      filename: file.name,
      headerRow: headerRow > 0 ? headerRow : undefined,
    });

    await snapshotLegalCasesBeforeImport(
      prisma,
      user.organizationId,
      file.name,
    );
    const imported = await replaceOrganizationLegalCases(
      prisma,
      user.organizationId,
      parsed,
    );

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { legalSheetHeaderRow: resolvedHeaderRow },
    });

    revalidateCasesPaths();

    return {
      ok: true,
      message: `Imported ${imported.toLocaleString()} cases. A backup of the previous data was saved.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import failed.";
    return { ok: false, message };
  }
}

export async function restoreLegalCasesBackupAction(
  _prev: LegalCasesSettingsState,
): Promise<LegalCasesSettingsState> {
  const user = await requireLegalAdmin();
  if (!user) {
    return { ok: false, message: "Only managers and admins can restore backups." };
  }

  try {
    const { restored } = await restoreLegalCasesBackup(prisma, user.organizationId);
    revalidateCasesPaths();
    return {
      ok: true,
      message: `Restored ${restored.toLocaleString()} cases from the last backup.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not restore backup.";
    return { ok: false, message };
  }
}

export async function searchLegalCasesForSettingsAction(
  _prev: LegalCasesSettingsState,
  formData: FormData,
): Promise<LegalCasesSettingsState> {
  const user = await requireLegalAdmin();
  if (!user) {
    return { ok: false, message: "Only managers and admins can search cases." };
  }

  const q = formData.get("q")?.toString().trim() ?? "";
  if (!q) {
    return { ok: false, message: "Enter a file number, MCC, or applicant name." };
  }

  const cases = await prisma.legalCase.findMany({
    where: {
      organizationId: user.organizationId,
      OR: [
        { fileNumber: { contains: q, mode: "insensitive" } },
        { mccNumber: { contains: q, mode: "insensitive" } },
        { applicant: { contains: q, mode: "insensitive" } },
        { nonApplicant: { contains: q, mode: "insensitive" } },
      ],
    },
    select: CASE_SEARCH_SELECT,
    orderBy: [{ fileNumber: "asc" }, { mccNumber: "asc" }],
    take: SEARCH_RESULT_LIMIT,
  });

  if (cases.length === 0) {
    return { ok: false, message: `No cases matched "${q}".` };
  }

  return {
    ok: true,
    message: `Found ${cases.length.toLocaleString()} case${cases.length === 1 ? "" : "s"}.`,
    cases: cases.map(toSearchRow),
  };
}

export async function updateLegalCaseFromSettingsAction(
  _prev: LegalCasesSettingsState,
  formData: FormData,
): Promise<LegalCasesSettingsState> {
  const user = await requireLegalAdmin();
  if (!user) {
    return { ok: false, message: "Only managers and admins can edit cases." };
  }

  const caseId = formData.get("caseId")?.toString() ?? "";
  const fileNumber = formData.get("fileNumber")?.toString().trim() ?? "";
  if (!caseId || !fileNumber) {
    return { ok: false, message: "Case id and file number are required." };
  }

  const existing = await prisma.legalCase.findFirst({
    where: { id: caseId, organizationId: user.organizationId },
  });
  if (!existing) {
    return { ok: false, message: "Case not found." };
  }

  await prisma.legalCase.updateMany({
    where: { id: caseId, organizationId: user.organizationId },
    data: {
      fileNumber,
      mccNumber: textField(formData, "mccNumber"),
      applicant: textField(formData, "applicant"),
      nonApplicant: textField(formData, "nonApplicant"),
      category: textField(formData, "category"),
      caseStage: textField(formData, "caseStage"),
      fileStatus: textField(formData, "fileStatus"),
      court: textField(formData, "court"),
      company: textField(formData, "company"),
      coAdvocate: textField(formData, "coAdvocate"),
      prevDate: textField(formData, "prevDate"),
      nextDate: textField(formData, "nextDate"),
      remarks: textField(formData, "remarks"),
      amdCcStatus: textField(formData, "amdCcStatus"),
      fNo: textField(formData, "fNo"),
      s2Responsible: textField(formData, "s2Responsible"),
      s3Responsible: textField(formData, "s3Responsible"),
      s4Responsible: textField(formData, "s4Responsible"),
      s5Responsible: textField(formData, "s5Responsible"),
      s6Responsible: textField(formData, "s6Responsible"),
      s7Responsible: textField(formData, "s7Responsible"),
    },
  });

  revalidateCasesPaths();
  revalidatePath(`/app/cases/${caseId}`);

  return { ok: true, message: `Updated file ${fileNumber}.` };
}
