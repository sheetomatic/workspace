import type { EmployeeDocumentType, EmployeeOnboardingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Required docs for Phase 1 onboarding checklist. */
export const REQUIRED_ONBOARDING_DOC_TYPES: EmployeeDocumentType[] = [
  "EDUCATION_QUALIFICATION",
  "CV",
  "WORK_EXPERIENCE",
  "NOC_RESIGNATION",
  "AADHAAR",
  "PAN",
];

export type OnboardingChecklistItem = {
  docType: EmployeeDocumentType;
  label: string;
  uploaded: boolean;
  documentId: string | null;
};

const DOC_LABELS: Record<EmployeeDocumentType, string> = {
  EDUCATION_QUALIFICATION: "Education Qualification",
  CV: "CV / Resume",
  WORK_EXPERIENCE: "Work Experience",
  NOC_RESIGNATION: "NOC / Resignation Letter",
  AADHAAR: "Aadhaar",
  PAN: "PAN",
  OFFER_LETTER: "Offer Letter",
  CONTRACT: "Contract",
  OTHER: "Other",
};

export function onboardingDocLabel(docType: EmployeeDocumentType): string {
  return DOC_LABELS[docType] ?? docType;
}

export async function getOnboardingChecklist(params: {
  organizationId: string;
  employeeProfileId: string;
}): Promise<{
  onboardingStatus: EmployeeOnboardingStatus;
  educationSummary: string | null;
  experienceSummary: string | null;
  items: OnboardingChecklistItem[];
  allRequiredUploaded: boolean;
}> {
  const profile = await prisma.employeeProfile.findFirst({
    where: {
      id: params.employeeProfileId,
      organizationId: params.organizationId,
    },
    select: {
      onboardingStatus: true,
      educationSummary: true,
      experienceSummary: true,
      documents: {
        select: { id: true, docType: true },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });
  if (!profile) {
    throw new Error("Employee profile not found.");
  }

  const byType = new Map<EmployeeDocumentType, string>();
  for (const doc of profile.documents) {
    if (!byType.has(doc.docType)) {
      byType.set(doc.docType, doc.id);
    }
  }

  const items: OnboardingChecklistItem[] = REQUIRED_ONBOARDING_DOC_TYPES.map(
    (docType) => ({
      docType,
      label: onboardingDocLabel(docType),
      uploaded: byType.has(docType),
      documentId: byType.get(docType) ?? null,
    }),
  );

  return {
    onboardingStatus: profile.onboardingStatus,
    educationSummary: profile.educationSummary,
    experienceSummary: profile.experienceSummary,
    items,
    allRequiredUploaded: items.every((item) => item.uploaded),
  };
}

export async function completeOnboarding(params: {
  organizationId: string;
  employeeProfileId: string;
  /** ADMIN may skip incomplete docs. */
  skipIncomplete?: boolean;
  educationSummary?: string | null;
  experienceSummary?: string | null;
  actorIsAdmin?: boolean;
}) {
  const checklist = await getOnboardingChecklist({
    organizationId: params.organizationId,
    employeeProfileId: params.employeeProfileId,
  });

  if (!checklist.allRequiredUploaded) {
    if (!(params.skipIncomplete && params.actorIsAdmin)) {
      const missing = checklist.items
        .filter((i) => !i.uploaded)
        .map((i) => i.label)
        .join(", ");
      throw new Error(`Upload required documents first: ${missing}.`);
    }
  }

  const onboardingStatus: EmployeeOnboardingStatus =
    checklist.allRequiredUploaded
      ? "COMPLETE"
      : params.skipIncomplete
        ? "SKIPPED"
        : "COMPLETE";

  const profile = await prisma.employeeProfile.update({
    where: { id: params.employeeProfileId },
    data: {
      onboardingStatus,
      ...(params.educationSummary !== undefined
        ? { educationSummary: params.educationSummary?.trim() || null }
        : {}),
      ...(params.experienceSummary !== undefined
        ? { experienceSummary: params.experienceSummary?.trim() || null }
        : {}),
    },
  });

  // Mark matching invitations complete when email matches.
  const user = await prisma.user.findUnique({
    where: { id: profile.userId },
    select: { email: true },
  });
  if (user?.email) {
    await prisma.invitation.updateMany({
      where: {
        organizationId: params.organizationId,
        email: user.email.toLowerCase(),
        onboardingCompletedAt: null,
      },
      data: { onboardingCompletedAt: new Date() },
    });
  }

  return profile;
}

export async function setOnboardingPending(params: {
  organizationId: string;
  employeeProfileId: string;
}) {
  const result = await prisma.employeeProfile.updateMany({
    where: {
      id: params.employeeProfileId,
      organizationId: params.organizationId,
    },
    data: { onboardingStatus: "PENDING_DOCS" },
  });
  if (result.count === 0) {
    throw new Error("Employee profile not found.");
  }
}

/**
 * After invite/membership create: ensure EmployeeProfile exists and set
 * onboardingStatus to PENDING_DOCS when requireOnboarding is true.
 * When requireOnboarding is false, new profiles stay COMPLETE (schema default).
 */
export async function ensureOnboardingAfterInvite(params: {
  organizationId: string;
  membershipId: string;
  userId: string;
  requireOnboarding: boolean;
  staffCode?: string | null;
}) {
  const existing = await prisma.employeeProfile.findFirst({
    where: {
      membershipId: params.membershipId,
      organizationId: params.organizationId,
    },
    select: { id: true },
  });

  if (existing) {
    if (params.requireOnboarding) {
      await setOnboardingPending({
        organizationId: params.organizationId,
        employeeProfileId: existing.id,
      });
    }
    return existing.id;
  }

  let employeeCode = (params.staffCode ?? "").trim().toUpperCase();
  if (!employeeCode) {
    employeeCode = `EMP-${params.membershipId.slice(-8).toUpperCase()}`;
  }

  const clash = await prisma.employeeProfile.findFirst({
    where: {
      organizationId: params.organizationId,
      employeeCode,
    },
    select: { id: true },
  });
  if (clash) {
    employeeCode = `EMP-${params.membershipId.slice(-10).toUpperCase()}`;
  }

  const profile = await prisma.employeeProfile.create({
    data: {
      organizationId: params.organizationId,
      membershipId: params.membershipId,
      userId: params.userId,
      employeeCode,
      onboardingStatus: params.requireOnboarding ? "PENDING_DOCS" : "COMPLETE",
    },
    select: { id: true },
  });

  return profile.id;
}
