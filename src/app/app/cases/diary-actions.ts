"use server";

import { revalidatePath } from "next/cache";
import type { LegalCaseActionState } from "@/app/app/cases/actions";
import {
  initialFileCoverActionState,
} from "@/app/app/cases/file-cover-actions";
import { getSessionUser } from "@/lib/auth";
import { canEditLegalSection } from "@/lib/legal-cases/access";
import { mergeSectionDataWithFileCover } from "@/lib/legal-cases/file-cover";
import {
  applyProcessDiary,
  type ProcessDiaryAction,
} from "@/lib/legal-cases/process-diary";
import { getLegalCaseForUser } from "@/lib/legal-cases/queries";
import { upsertLegalCaseToGoogleSheet } from "@/lib/integrations/google-sheets-legal-cases";
import { prisma } from "@/lib/db";

export async function quickDiaryUpdateAction(
  _prev: LegalCaseActionState,
  formData: FormData,
): Promise<LegalCaseActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Sign in required." };
  }

  const caseId = formData.get("caseId")?.toString() ?? "";
  const action = formData.get("action")?.toString() as ProcessDiaryAction;
  const nextDate = formData.get("nextDate")?.toString().trim() ?? "";

  if (!caseId || !action) {
    return { ok: false, message: "Case and action are required." };
  }

  const legalCase = await getLegalCaseForUser(user, caseId);
  if (!legalCase) {
    return { ok: false, message: "Case not found." };
  }

  if (!canEditLegalSection(user, legalCase, 2)) {
    return { ok: false, message: "You cannot update the court diary for this case." };
  }

  const result = applyProcessDiary(legalCase, {
    action,
    nextDate: nextDate || undefined,
  });

  const fileCover = result.fileCover;
  const sectionData = mergeSectionDataWithFileCover(legalCase.sectionData, fileCover);

  const updated = await prisma.legalCase.update({
    where: { id: legalCase.id },
    data: {
      fileStatus: result.fileStatus ?? legalCase.fileStatus,
      caseStage: result.caseStage ?? legalCase.caseStage,
      prevDate: result.prevDate ?? legalCase.prevDate,
      nextDate: nextDate || result.nextDate || legalCase.nextDate,
      amdCcStatus: result.amdCcStatus ?? legalCase.amdCcStatus,
      sectionData,
    },
  });

  void upsertLegalCaseToGoogleSheet(user.organizationId, updated).catch((error) => {
    console.error("[diary-quick-update-sheet-sync]", error);
  });

  revalidatePath("/app/cases/views/diary");
  revalidatePath("/app/cases/views/diary/quick-update");

  return { ok: true, message: result.message };
}

export { initialFileCoverActionState as initialDiaryActionState };
