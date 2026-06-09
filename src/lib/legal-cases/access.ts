import type { LegalCase } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import {
  type LegalSectionNumber,
  SECTION_RESPONSIBLE_FIELD,
} from "@/lib/legal-cases/constants";

export function isLegalAdmin(user: SessionUser) {
  return user.isSuperAdmin || hasMinimumRole(user.role, "MANAGER");
}

export function normalizeStaffCode(code: string | null | undefined) {
  return code?.trim().toUpperCase() ?? "";
}

export function caseResponsibleCodes(legalCase: LegalCase) {
  return [
    legalCase.s2Responsible,
    legalCase.s3Responsible,
    legalCase.s4Responsible,
    legalCase.s5Responsible,
    legalCase.s6Responsible,
    legalCase.s7Responsible,
  ]
    .map(normalizeStaffCode)
    .filter(Boolean);
}

export function userStaffCode(user: SessionUser) {
  return normalizeStaffCode(user.staffCode);
}

export function sectionResponsibleCode(
  legalCase: LegalCase,
  section: Exclude<LegalSectionNumber, 1 | 8>,
) {
  const field = SECTION_RESPONSIBLE_FIELD[section];
  return normalizeStaffCode(legalCase[field] as string | null);
}

export function isAssignedToSection(
  legalCase: LegalCase,
  section: Exclude<LegalSectionNumber, 1 | 8>,
  staffCode: string,
) {
  if (!staffCode) {
    return false;
  }
  return sectionResponsibleCode(legalCase, section) === staffCode;
}

export function assignedSectionsForCode(
  legalCase: LegalCase,
  staffCode: string,
): Exclude<LegalSectionNumber, 1 | 8>[] {
  if (!staffCode) {
    return [];
  }
  return ([2, 3, 4, 5, 6, 7] as const).filter((section) =>
    isAssignedToSection(legalCase, section, staffCode),
  );
}

export function canViewLegalCase(user: SessionUser, legalCase: LegalCase) {
  if (isLegalAdmin(user)) {
    return true;
  }
  return assignedSectionsForCode(legalCase, userStaffCode(user)).length > 0;
}

export function canViewLegalSection(
  user: SessionUser,
  legalCase: LegalCase,
  section: LegalSectionNumber,
) {
  if (isLegalAdmin(user)) {
    return true;
  }
  if (section === 1) {
    return canViewLegalCase(user, legalCase);
  }
  if (section === 8) {
    return false;
  }
  return isAssignedToSection(
    legalCase,
    section as Exclude<LegalSectionNumber, 1 | 8>,
    userStaffCode(user),
  );
}

export function canEditLegalSection(
  user: SessionUser,
  legalCase: LegalCase,
  section: LegalSectionNumber,
) {
  if (isLegalAdmin(user)) {
    return true;
  }
  if (section === 1 || section === 8) {
    return false;
  }
  return isAssignedToSection(
    legalCase,
    section as Exclude<LegalSectionNumber, 1 | 8>,
    userStaffCode(user),
  );
}

export function viewableSectionsForUser(
  user: SessionUser,
  legalCase: LegalCase,
): LegalSectionNumber[] {
  const sections: LegalSectionNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];
  return sections.filter((section) => canViewLegalSection(user, legalCase, section));
}

export function editableSectionsForUser(
  user: SessionUser,
  legalCase: LegalCase,
): LegalSectionNumber[] {
  const sections: LegalSectionNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];
  return sections.filter((section) => canEditLegalSection(user, legalCase, section));
}
