"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canEditLegalSection,
  isLegalAdmin,
  normalizeStaffCode,
} from "@/lib/legal-cases/access";
import {
  documentCategoryByKey,
  type LegalSectionNumber,
} from "@/lib/legal-cases/constants";
import {
  exportLegalCasesToGoogleSheet,
  importLegalCasesFromGoogleSheet,
  syncLegalCasesTwoWay,
} from "@/lib/integrations/google-sheets-legal-cases";
import { replaceOrganizationLegalCases } from "@/lib/legal-cases/import-csv";
import {
  getLegalCaseForUser,
  upsertLegalCaseFromImport,
} from "@/lib/legal-cases/queries";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type LegalCaseActionState = {
  ok: boolean;
  message: string;
};

export const initialLegalCaseActionState: LegalCaseActionState = {
  ok: false,
  message: "",
};

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function textField(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim() ?? "";
  return value || null;
}

export async function uploadLegalCaseDocument(
  formData: FormData,
): Promise<LegalCaseActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Sign in required." };
  }

  const caseId = formData.get("caseId")?.toString() ?? "";
  const section = Number(formData.get("section"));
  const categoryKey = formData.get("category")?.toString() ?? "";
  const displayName = formData.get("displayName")?.toString().trim() ?? "";
  const files = formData.getAll("files").filter((entry) => entry instanceof File);

  if (!caseId || !displayName || files.length === 0) {
    return { ok: false, message: "Case, name, and file are required." };
  }

  const category = documentCategoryByKey(categoryKey);
  if (!category) {
    return { ok: false, message: "Invalid document category." };
  }

  const legalCase = await getLegalCaseForUser(user, caseId);
  if (!legalCase) {
    return { ok: false, message: "Case not found." };
  }

  if (!canEditLegalSection(user, legalCase, section as LegalSectionNumber)) {
    return { ok: false, message: "You cannot upload to this section." };
  }

  for (const file of files) {
    if (!(file instanceof File) || file.size <= 0) {
      continue;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        message: `${file.name} is too large (max 12 MB).`,
      };
    }

    const data = Buffer.from(await file.arrayBuffer());
    await prisma.legalCaseDocument.create({
      data: {
        organizationId: user.organizationId,
        caseId: legalCase.id,
        section,
        category: category.key,
        displayName,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        data,
        uploadedById: user.id,
      },
    });
  }

  revalidatePath(`/app/cases/${legalCase.id}`);
  return { ok: true, message: "Document uploaded." };
}

export async function createLegalCase(
  _prev: LegalCaseActionState,
  formData: FormData,
): Promise<LegalCaseActionState> {
  const user = await getSessionUser();
  if (!user || !isLegalAdmin(user)) {
    return { ok: false, message: "Only managers and admins can create cases." };
  }

  const fileNumber = formData.get("fileNumber")?.toString().trim() ?? "";
  const mccNumber = formData.get("mccNumber")?.toString().trim() || null;

  if (!fileNumber) {
    return { ok: false, message: "File number is required." };
  }

  const created = await upsertLegalCaseFromImport(user.organizationId, {
    fileNumber,
    mccNumber,
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
    s2Responsible: textField(formData, "s2Responsible"),
    s3Responsible: textField(formData, "s3Responsible"),
    s4Responsible: textField(formData, "s4Responsible"),
    s5Responsible: textField(formData, "s5Responsible"),
    s6Responsible: textField(formData, "s6Responsible"),
    s7Responsible: textField(formData, "s7Responsible"),
  });

  revalidatePath("/app/cases");
  revalidatePath("/app/cases/list");
  redirect(`/app/cases/${created.id}`);
}

export async function syncLegalCasesFromGoogleSheet(): Promise<LegalCaseActionState> {
  const user = await getSessionUser();
  if (!user || !isLegalAdmin(user)) {
    return { ok: false, message: "Only managers and admins can sync cases." };
  }

  try {
    const cases = await importLegalCasesFromGoogleSheet(user.organizationId);
    const imported = await replaceOrganizationLegalCases(
      prisma,
      user.organizationId,
      cases,
    );

    revalidatePath("/app/cases");
    revalidatePath("/app/cases/list");
    revalidatePath("/app/team");

    return {
      ok: true,
      message: `Imported ${imported.toLocaleString()} cases from Google Sheet.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not import from Google Sheet.";
    return { ok: false, message };
  }
}

export async function exportLegalCasesToGoogleSheetAction(): Promise<LegalCaseActionState> {
  const user = await getSessionUser();
  if (!user || !isLegalAdmin(user)) {
    return { ok: false, message: "Only managers and admins can sync cases." };
  }

  try {
    const { exported, spreadsheetId } = await exportLegalCasesToGoogleSheet(
      user.organizationId,
    );

    return {
      ok: true,
      message: `Exported ${exported.toLocaleString()} cases to Google Sheet (${spreadsheetId}).`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not export to Google Sheet.";
    return { ok: false, message };
  }
}

export async function syncLegalCasesTwoWayAction(): Promise<LegalCaseActionState> {
  const user = await getSessionUser();
  if (!user || !isLegalAdmin(user)) {
    return { ok: false, message: "Only managers and admins can sync cases." };
  }

  try {
    const { imported, exported } = await syncLegalCasesTwoWay(user.organizationId);

    revalidatePath("/app/cases");
    revalidatePath("/app/cases/list");
    revalidatePath("/app/team");

    return {
      ok: true,
      message: `Two-way sync complete: imported ${imported.toLocaleString()} cases, exported ${exported.toLocaleString()} cases.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not sync with Google Sheet.";
    return { ok: false, message };
  }
}
