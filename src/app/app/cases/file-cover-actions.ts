"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import {
  EMPTY_FILE_COVER,
  fileCoverFromLegalCase,
  fileCoverToCaseScalars,
  mergeSectionDataWithFileCover,
  type FileCoverData,
} from "@/lib/legal-cases/file-cover";
import {
  applyProcessDiary,
  type ProcessDiaryAction,
} from "@/lib/legal-cases/process-diary";
import { upsertLegalCaseToGoogleSheet } from "@/lib/integrations/google-sheets-legal-cases";
import {
  getLegalCaseForUser,
  upsertLegalCaseFromImport,
} from "@/lib/legal-cases/queries";
import type { LegalCaseActionState } from "@/app/app/cases/actions";

export const initialFileCoverActionState: LegalCaseActionState = {
  ok: false,
  message: "",
};

function textField(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim() ?? "";
  return value || null;
}

function parseFileCoverPayload(formData: FormData): FileCoverData {
  const base = structuredClone(EMPTY_FILE_COVER);
  const raw = formData.get("fileCoverJson")?.toString();
  if (!raw) {
    return base;
  }
  try {
    const parsed = JSON.parse(raw) as FileCoverData;
    return {
      ...base,
      ...parsed,
      processLog: parsed.processLog?.length ? parsed.processLog : base.processLog,
      pfTracking: parsed.pfTracking?.length ? parsed.pfTracking : base.pfTracking,
      calledClientLog: parsed.calledClientLog?.length
        ? parsed.calledClientLog
        : base.calledClientLog,
    };
  } catch {
    return base;
  }
}

async function persistCaseWithFileCover(params: {
  organizationId: string;
  caseId?: string;
  fileNumber: string;
  mccNumber?: string | null;
  applicant?: string | null;
  nonApplicant?: string | null;
  category?: string | null;
  court?: string | null;
  company?: string | null;
  fileStatus?: string | null;
  caseStage?: string | null;
  prevDate?: string | null;
  nextDate?: string | null;
  coAdvocate?: string | null;
  amdCcStatus?: string | null;
  fileCover: FileCoverData;
  existingSectionData?: unknown;
}) {
  const scalars = fileCoverToCaseScalars(params.fileCover, {
    fileNumber: params.fileNumber,
    mccNumber: params.mccNumber,
    applicant: params.applicant,
    nonApplicant: params.nonApplicant,
    category: params.category,
    court: params.court,
    company: params.company,
    fileStatus: params.fileStatus,
    caseStage: params.caseStage,
    prevDate: params.prevDate,
    nextDate: params.nextDate,
    coAdvocate: params.coAdvocate,
  });

  const sectionData = mergeSectionDataWithFileCover(
    params.existingSectionData,
    params.fileCover,
  );

  const saved = await upsertLegalCaseFromImport(params.organizationId, {
    ...scalars,
    amdCcStatus: params.amdCcStatus,
    sectionData,
  });

  try {
    await upsertLegalCaseToGoogleSheet(params.organizationId, saved);
  } catch (error) {
    console.error("[file-cover-sheet-sync]", error);
  }

  return saved;
}

export async function saveFileCoverAction(
  _prev: LegalCaseActionState,
  formData: FormData,
): Promise<LegalCaseActionState> {
  const user = await getSessionUser();
  if (!user || !isLegalAdmin(user)) {
    return { ok: false, message: "Only managers and admins can save file covers." };
  }

  const fileNumber = formData.get("fileNumber")?.toString().trim() ?? "";
  if (!fileNumber) {
    return { ok: false, message: "File number is required." };
  }

  const caseId = formData.get("caseId")?.toString() ?? "";
  const existing = caseId
    ? await prisma.legalCase.findFirst({
        where: { id: caseId, organizationId: user.organizationId },
      })
    : null;

  const fileCover = parseFileCoverPayload(formData);

  const saved = await persistCaseWithFileCover({
    organizationId: user.organizationId,
    caseId,
    fileNumber,
    mccNumber: textField(formData, "mccNumber"),
    applicant: textField(formData, "applicant"),
    nonApplicant: textField(formData, "nonApplicant"),
    category: textField(formData, "category"),
    court: textField(formData, "court"),
    company: textField(formData, "company"),
    fileStatus: textField(formData, "fileStatus"),
    caseStage: textField(formData, "caseStage"),
    prevDate: textField(formData, "prevDate"),
    nextDate: textField(formData, "nextDate"),
    coAdvocate: textField(formData, "coAdvocate"),
    amdCcStatus: textField(formData, "amdCcStatus"),
    fileCover,
    existingSectionData: existing?.sectionData,
  });

  revalidatePath("/app/cases");
  revalidatePath(`/app/cases/${saved.id}`);
  redirect(`/app/cases/${saved.id}/file-cover?saved=1`);
}

function syncCaseToGoogleSheet(organizationId: string, legalCaseId: string) {
  void upsertLegalCaseToGoogleSheet(organizationId, { id: legalCaseId }).catch(
    (error) => {
      console.error("[process-diary-sheet-sync]", error);
    },
  );
}

export async function applyProcessDiaryAction(
  _prev: LegalCaseActionState,
  formData: FormData,
): Promise<LegalCaseActionState> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { ok: false, message: "Sign in required." };
    }

    const caseId = formData.get("caseId")?.toString() ?? "";
    const action = formData.get("action")?.toString() as ProcessDiaryAction;
    if (!caseId || !action) {
      return { ok: false, message: "Case and action are required." };
    }

    const legalCase = await getLegalCaseForUser(user, caseId);
    if (!legalCase) {
      return { ok: false, message: "Case not found." };
    }

    const result = applyProcessDiary(legalCase, {
      action,
      logDate: formData.get("logDate")?.toString(),
      logProcess: formData.get("logProcess")?.toString(),
      nextDate: formData.get("nextDate")?.toString(),
      coAdvocate: formData.get("coAdvocate")?.toString(),
      ownerDriverLawyer: formData.get("ownerDriverLawyer")?.toString(),
      odPhone: formData.get("odPhone")?.toString(),
      pfReadyDt: formData.get("pfReadyDt")?.toString(),
      pfCourtDt: formData.get("pfCourtDt")?.toString(),
      pfPostDt: formData.get("pfPostDt")?.toString(),
      clientCallDate: formData.get("clientCallDate")?.toString(),
      clientCallBy: formData.get("clientCallBy")?.toString(),
    });

    const fileCover = result.fileCover;
    const pfRow = fileCover.pfTracking[0];
    const sectionData = mergeSectionDataWithFileCover(
      legalCase.sectionData,
      fileCover,
      {
        ...(pfRow?.pfLastDt ? { "PF READY DT STAMP": pfRow.pfLastDt } : {}),
        ...(pfRow?.vikkyDt ? { "PF COURT DT STAMP": pfRow.vikkyDt } : {}),
        ...(pfRow?.postDt ? { "PF POST DT STAMP": pfRow.postDt } : {}),
        ...(fileCover.calledClientLog[0]?.date
          ? { "CALLED CLIENT": fileCover.calledClientLog[0].date }
          : {}),
      },
    );

    await prisma.legalCase.update({
      where: { id: legalCase.id },
      data: {
        fileStatus: result.fileStatus ?? legalCase.fileStatus,
        caseStage: result.caseStage ?? legalCase.caseStage,
        prevDate: result.prevDate ?? legalCase.prevDate,
        nextDate:
          formData.get("nextDate")?.toString().trim() ||
          result.nextDate ||
          legalCase.nextDate,
        mccNumber: formData.get("mccNumber")?.toString().trim() || legalCase.mccNumber,
        coAdvocate:
          formData.get("coAdvocate")?.toString().trim() ||
          result.coAdvocate ||
          legalCase.coAdvocate,
        amdCcStatus: result.amdCcStatus ?? legalCase.amdCcStatus,
        sectionData,
      },
    });

    syncCaseToGoogleSheet(user.organizationId, legalCase.id);

    return { ok: true, message: result.message };
  } catch (error) {
    console.error("[apply-process-diary]", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not save diary update. Try again.",
    };
  }
}

export async function loadFileCoverForCase(caseId: string) {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  const legalCase = await getLegalCaseForUser(user, caseId);
  if (!legalCase) {
    return null;
  }
  return {
    legalCase,
    fileCover: fileCoverFromLegalCase(legalCase),
  };
}
