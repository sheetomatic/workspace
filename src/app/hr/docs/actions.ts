"use server";

import { revalidatePath } from "next/cache";
import {
  getEmployeeDocsLinkContext,
  verifyEmployeeDocsToken,
} from "@/lib/hr/docs-link";
import { completeOnboarding, saveOnboardingDraft } from "@/lib/hr/onboarding";
import {
  deleteEmployeeDocument,
  uploadEmployeeDocument,
} from "@/lib/hr/employees";
import { prisma } from "@/lib/db";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const ALLOWED_DOC_TYPES = [
  "AADHAAR",
  "PAN",
  "OFFER_LETTER",
  "CONTRACT",
  "EDUCATION_QUALIFICATION",
  "CV",
  "WORK_EXPERIENCE",
  "NOC_RESIGNATION",
  "OTHER",
] as const;

export type PublicDocsActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function failure(message: string): PublicDocsActionResult {
  return { ok: false, message };
}

async function requireDocsContext(token: string) {
  const ctx = await getEmployeeDocsLinkContext(token);
  if (!ctx) {
    throw new Error("This document link is invalid or has expired.");
  }
  return ctx;
}

export async function uploadPublicEmployeeDocAction(
  formData: FormData,
): Promise<PublicDocsActionResult> {
  const token = String(formData.get("token") ?? "").trim();
  const docTypeRaw = String(formData.get("docType") ?? "").trim();
  const file = formData.get("file");

  if (!ALLOWED_DOC_TYPES.includes(docTypeRaw as (typeof ALLOWED_DOC_TYPES)[number])) {
    return failure("Choose a valid document type.");
  }
  if (!(file instanceof File) || file.size === 0) {
    return failure("Choose a file to upload.");
  }
  if (file.size > MAX_BYTES) {
    return failure("File is too large. Maximum size is 8 MB.");
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return failure("Only PDF, PNG, JPG, or WEBP files are allowed.");
  }

  try {
    const ctx = await requireDocsContext(token);
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadEmployeeDocument({
      organizationId: ctx.profile.organizationId,
      employeeProfileId: ctx.profile.id,
      uploadedById: ctx.profile.userId,
      docType: docTypeRaw as (typeof ALLOWED_DOC_TYPES)[number],
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      data: new Uint8Array(buffer),
    });
    await saveOnboardingDraft({
      organizationId: ctx.profile.organizationId,
      employeeProfileId: ctx.profile.id,
    });
    revalidatePath(`/hr/docs/${encodeURIComponent(token)}`);
    return { ok: true, message: "Document saved to your draft." };
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Could not upload document.",
    );
  }
}

export async function deletePublicEmployeeDocAction(
  formData: FormData,
): Promise<PublicDocsActionResult> {
  const token = String(formData.get("token") ?? "").trim();
  const documentId = String(formData.get("documentId") ?? "").trim();
  if (!documentId) {
    return failure("Document is required.");
  }

  try {
    const ctx = await requireDocsContext(token);
    const document = await prisma.employeeDocument.findFirst({
      where: {
        id: documentId,
        organizationId: ctx.profile.organizationId,
        employeeProfileId: ctx.profile.id,
      },
      select: { id: true },
    });
    if (!document) {
      return failure("Document not found.");
    }
    await deleteEmployeeDocument({
      organizationId: ctx.profile.organizationId,
      documentId,
    });
    await saveOnboardingDraft({
      organizationId: ctx.profile.organizationId,
      employeeProfileId: ctx.profile.id,
    });
    revalidatePath(`/hr/docs/${encodeURIComponent(token)}`);
    return { ok: true, message: "Document removed from draft." };
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Could not remove document.",
    );
  }
}

export async function savePublicEmployeeDocsDraftAction(
  formData: FormData,
): Promise<PublicDocsActionResult> {
  const token = String(formData.get("token") ?? "").trim();
  try {
    const ctx = await requireDocsContext(token);
    await saveOnboardingDraft({
      organizationId: ctx.profile.organizationId,
      employeeProfileId: ctx.profile.id,
      educationSummary: String(formData.get("educationSummary") ?? ""),
      experienceSummary: String(formData.get("experienceSummary") ?? ""),
    });
    revalidatePath(`/hr/docs/${encodeURIComponent(token)}`);
    return {
      ok: true,
      message: "Draft saved. Come back to this link when you are ready to submit.",
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Could not save draft.");
  }
}

export async function submitPublicEmployeeDocsAction(
  formData: FormData,
): Promise<PublicDocsActionResult> {
  const token = String(formData.get("token") ?? "").trim();
  if (!verifyEmployeeDocsToken(token)) {
    return failure("This document link is invalid or has expired.");
  }

  try {
    const ctx = await requireDocsContext(token);
    await completeOnboarding({
      organizationId: ctx.profile.organizationId,
      employeeProfileId: ctx.profile.id,
      educationSummary: String(formData.get("educationSummary") ?? "").trim() || null,
      experienceSummary: String(formData.get("experienceSummary") ?? "").trim() || null,
    });
    revalidatePath(`/hr/docs/${encodeURIComponent(token)}`);
    return { ok: true, message: "Documents submitted. HR can see them now." };
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Could not submit documents.",
    );
  }
}
