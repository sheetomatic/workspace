import { Decimal } from "@prisma/client/runtime/library";
import type {
  EmployeeDocumentType,
  EmployeeStatus,
  EmploymentType,
  Prisma,
  TaskDepartment,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureLeaveBalances } from "@/lib/hr/payroll";

const MAX_DOC_BYTES = 8 * 1024 * 1024;
const ALLOWED_DOC_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function decOrNull(value: number | null | undefined): Decimal | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return new Decimal(Math.round(value * 100) / 100);
}

function num(value: Decimal | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  return Number(value);
}

function aadhaarLast4From(aadhaar: string | null | undefined): string | null {
  const digits = (aadhaar ?? "").replace(/\D/g, "");
  if (digits.length < 4) {
    return null;
  }
  return digits.slice(-4);
}

export type EmployeeProfileInput = {
  membershipId: string;
  employeeCode: string;
  employmentType?: EmploymentType;
  status?: EmployeeStatus;
  designation?: string | null;
  department?: TaskDepartment | null;
  staffCode?: string | null;
  dateOfJoining?: Date | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  phone?: string | null;
  emergencyContact?: string | null;
  address?: string | null;
  pan?: string | null;
  aadhaar?: string | null;
  monthlySalary?: number | null;
  basic?: number | null;
  hra?: number | null;
  specialAllowance?: number | null;
  esiApplicable?: boolean;
  esiNumber?: string | null;
  pfApplicable?: boolean;
  uan?: string | null;
  pfNumber?: string | null;
  taxRegime?: string | null;
  tdsMonthly?: number | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  ifsc?: string | null;
  collarCategory?: "WHITE" | "BLUE";
  hourlyRate?: number | null;
  /** Assigned shift; empty/null clears to org default timing. */
  shiftId?: string | null;
};

export type EmployeeListItem = {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  designation: string | null;
  department: TaskDepartment | null;
  staffCode: string | null;
  monthlySalary: number | null;
  dateOfJoining: string | null;
  deactivatedAt: string | null;
  shiftId: string | null;
  shiftName: string | null;
  profile: {
    id: string;
    employeeCode: string;
    employmentType: EmploymentType;
    status: EmployeeStatus;
    onboardingStatus: string;
    phone: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    basic: number | null;
    hra: number | null;
    specialAllowance: number | null;
    pfApplicable: boolean;
    esiApplicable: boolean;
    tdsMonthly: number | null;
    bankName: string | null;
    ifsc: string | null;
    aadhaarLast4: string | null;
    collarCategory: "WHITE" | "BLUE";
    hourlyRate: number | null;
  } | null;
};

export type EmployeeDetail = EmployeeListItem & {
  profile: NonNullable<EmployeeListItem["profile"]> & {
    emergencyContact: string | null;
    address: string | null;
    pan: string | null;
    aadhaar: string | null;
    esiNumber: string | null;
    uan: string | null;
    pfNumber: string | null;
    taxRegime: string | null;
    bankAccountNumber: string | null;
  };
};

function ymd(date: Date | null | undefined): string | null {
  if (!date) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function mapListItem(
  row: {
    id: string;
    userId: string;
    role: string;
    designation: string | null;
    department: TaskDepartment | null;
    staffCode: string | null;
    monthlySalary: Decimal | null;
    dateOfJoining: Date | null;
    deactivatedAt: Date | null;
    shiftId: string | null;
    shift: { id: string; name: string } | null;
    user: { name: string | null; email: string };
    employeeProfile: {
      id: string;
      employeeCode: string;
      employmentType: EmploymentType;
      status: EmployeeStatus;
      onboardingStatus: string;
      phone: string | null;
      gender: string | null;
      dateOfBirth: Date | null;
      basic: Decimal | null;
      hra: Decimal | null;
      specialAllowance: Decimal | null;
      pfApplicable: boolean;
      esiApplicable: boolean;
      tdsMonthly: Decimal | null;
      bankName: string | null;
      ifsc: string | null;
      aadhaarLast4: string | null;
      collarCategory: "WHITE" | "BLUE";
      hourlyRate: Decimal | null;
    } | null;
  },
): EmployeeListItem {
  const profile = row.employeeProfile;
  return {
    membershipId: row.id,
    userId: row.userId,
    name: row.user.name,
    email: row.user.email,
    role: row.role,
    designation: row.designation,
    department: row.department,
    staffCode: row.staffCode,
    monthlySalary: num(row.monthlySalary),
    dateOfJoining: ymd(row.dateOfJoining),
    deactivatedAt: row.deactivatedAt ? row.deactivatedAt.toISOString() : null,
    shiftId: row.shiftId,
    shiftName: row.shift?.name ?? null,
    profile: profile
      ? {
          id: profile.id,
          employeeCode: profile.employeeCode,
          employmentType: profile.employmentType,
          status: profile.status,
          onboardingStatus: profile.onboardingStatus,
          phone: profile.phone,
          gender: profile.gender,
          dateOfBirth: ymd(profile.dateOfBirth),
          basic: num(profile.basic),
          hra: num(profile.hra),
          specialAllowance: num(profile.specialAllowance),
          pfApplicable: profile.pfApplicable,
          esiApplicable: profile.esiApplicable,
          tdsMonthly: num(profile.tdsMonthly),
          bankName: profile.bankName,
          ifsc: profile.ifsc,
          aadhaarLast4: profile.aadhaarLast4,
          collarCategory: profile.collarCategory,
          hourlyRate: num(profile.hourlyRate),
        }
      : null,
  };
}

/** List employees for an org. No PAN/Aadhaar in list payload. */
export async function listEmployees(
  organizationId: string,
  opts?: { includeExited?: boolean },
): Promise<EmployeeListItem[]> {
  const rows = await prisma.membership.findMany({
    where: {
      organizationId,
      role: { not: "VIEWER" },
      ...(opts?.includeExited
        ? {}
        : {
            deactivatedAt: null,
            OR: [
              { employeeProfile: null },
              { employeeProfile: { status: "ACTIVE" } },
            ],
          }),
    },
    select: {
      id: true,
      userId: true,
      role: true,
      designation: true,
      department: true,
      staffCode: true,
      monthlySalary: true,
      dateOfJoining: true,
      deactivatedAt: true,
      shiftId: true,
      shift: { select: { id: true, name: true } },
      user: { select: { name: true, email: true } },
      employeeProfile: {
        select: {
          id: true,
          employeeCode: true,
          employmentType: true,
          status: true,
          onboardingStatus: true,
          phone: true,
          gender: true,
          dateOfBirth: true,
          basic: true,
          hra: true,
          specialAllowance: true,
          pfApplicable: true,
          esiApplicable: true,
          tdsMonthly: true,
          bankName: true,
          ifsc: true,
          aadhaarLast4: true,
          collarCategory: true,
          hourlyRate: true,
        },
      },
    },
    orderBy: [{ user: { name: "asc" } }],
  });

  return rows.map(mapListItem);
}

function maskAccount(account: string | null): string | null {
  if (!account) {
    return null;
  }
  const digits = account.replace(/\s/g, "");
  if (digits.length <= 4) {
    return "****";
  }
  return `${"*".repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
}

/**
 * Membership + optional profile for registration form.
 * Sensitive identity (pan, aadhaar, full bank) only when includeSensitive=true (ADMIN+).
 * Returns the membership even when profile is missing (for first-time register).
 */
export async function getEmployeeForForm(
  organizationId: string,
  membershipId: string,
  opts?: { includeSensitive?: boolean },
) {
  const row = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId },
    include: {
      user: { select: { name: true, email: true } },
      shift: { select: { id: true, name: true, startTime: true, endTime: true } },
      employeeProfile: {
        include: {
          documents: {
            select: {
              id: true,
              docType: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
              uploadedAt: true,
            },
            orderBy: { uploadedAt: "desc" },
          },
        },
      },
    },
  });
  if (!row) {
    return null;
  }

  const sensitive = opts?.includeSensitive === true;
  const p = row.employeeProfile;

  return {
    membershipId: row.id,
    userId: row.userId,
    name: row.user.name,
    email: row.user.email,
    role: row.role,
    designation: row.designation,
    department: row.department,
    dateOfJoining: row.dateOfJoining,
    monthlySalary: num(row.monthlySalary),
    staffCode: row.staffCode,
    deactivatedAt: row.deactivatedAt,
    shiftId: row.shiftId,
    shiftName: row.shift?.name ?? null,
    shiftStartTime: row.shift?.startTime ?? null,
    shiftEndTime: row.shift?.endTime ?? null,
    profile: p
      ? {
          id: p.id,
          employeeCode: p.employeeCode,
          employmentType: p.employmentType,
          status: p.status,
          onboardingStatus: p.onboardingStatus,
          phone: p.phone,
          emergencyContact: p.emergencyContact,
          address: p.address,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
          pan: sensitive ? p.pan : null,
          aadhaar: sensitive ? p.aadhaar : null,
          aadhaarLast4: p.aadhaarLast4,
          basic: num(p.basic),
          hra: num(p.hra),
          specialAllowance: num(p.specialAllowance),
          esiApplicable: p.esiApplicable,
          esiNumber: p.esiNumber,
          pfApplicable: p.pfApplicable,
          uan: p.uan,
          pfNumber: p.pfNumber,
          taxRegime: p.taxRegime,
          tdsMonthly: num(p.tdsMonthly),
          bankName: p.bankName,
          bankAccountNumber: sensitive
            ? p.bankAccountNumber
            : maskAccount(p.bankAccountNumber),
          ifsc: p.ifsc,
          collarCategory: p.collarCategory,
          hourlyRate: num(p.hourlyRate),
          documents: p.documents,
        }
      : null,
  };
}

/**
 * Full employee detail when a profile exists.
 * Prefer getEmployeeForForm for registration pages (works before profile exists).
 */
export async function getEmployee(
  organizationId: string,
  membershipId: string,
  opts?: { includeSensitive?: boolean },
): Promise<EmployeeDetail | null> {
  const form = await getEmployeeForForm(organizationId, membershipId, opts);
  if (!form?.profile) {
    return null;
  }

  return {
    membershipId: form.membershipId,
    userId: form.userId,
    name: form.name,
    email: form.email,
    role: form.role,
    designation: form.designation,
    department: form.department,
    staffCode: form.staffCode,
    monthlySalary: form.monthlySalary,
    dateOfJoining: ymd(form.dateOfJoining),
    deactivatedAt: form.deactivatedAt ? form.deactivatedAt.toISOString() : null,
    shiftId: form.shiftId,
    shiftName: form.shiftName,
    profile: {
      id: form.profile.id,
      employeeCode: form.profile.employeeCode,
      employmentType: form.profile.employmentType,
      status: form.profile.status,
      onboardingStatus: form.profile.onboardingStatus,
      phone: form.profile.phone,
      gender: form.profile.gender,
      dateOfBirth: ymd(form.profile.dateOfBirth),
      basic: form.profile.basic,
      hra: form.profile.hra,
      specialAllowance: form.profile.specialAllowance,
      pfApplicable: form.profile.pfApplicable,
      esiApplicable: form.profile.esiApplicable,
      tdsMonthly: form.profile.tdsMonthly,
      bankName: form.profile.bankName,
      ifsc: form.profile.ifsc,
      aadhaarLast4: form.profile.aadhaarLast4,
      collarCategory: form.profile.collarCategory,
      hourlyRate: form.profile.hourlyRate,
      emergencyContact: form.profile.emergencyContact,
      address: form.profile.address,
      pan: form.profile.pan,
      aadhaar: form.profile.aadhaar,
      esiNumber: form.profile.esiNumber,
      uan: form.profile.uan,
      pfNumber: form.profile.pfNumber,
      taxRegime: form.profile.taxRegime,
      bankAccountNumber: form.profile.bankAccountNumber,
    },
  };
}

/** Create or update EmployeeProfile + sync Membership fields. Ensures leave balances. */
export async function upsertEmployeeProfile(
  organizationId: string,
  input: EmployeeProfileInput,
) {
  const code = input.employeeCode.trim().toUpperCase();
  if (!code) {
    throw new Error("Employee code is required.");
  }

  const membership = await prisma.membership.findFirst({
    where: { id: input.membershipId, organizationId },
    select: {
      id: true,
      userId: true,
      deactivatedAt: true,
      employeeProfile: { select: { id: true } },
    },
  });
  if (!membership) {
    throw new Error("Member not found in this workspace.");
  }
  const nextStatus = input.status ?? "ACTIVE";
  if (membership.deactivatedAt && nextStatus !== "ACTIVE") {
    throw new Error("Member is deactivated. Set status ACTIVE to restore.");
  }

  const clash = await prisma.employeeProfile.findFirst({
    where: {
      organizationId,
      employeeCode: code,
      NOT: membership.employeeProfile
        ? { id: membership.employeeProfile.id }
        : undefined,
    },
    select: { id: true },
  });
  if (clash) {
    throw new Error(`Employee code ${code} is already in use.`);
  }

  const aadhaar = input.aadhaar?.replace(/\s/g, "").trim() || null;
  const pan = input.pan?.trim().toUpperCase() || null;
  const staffCode = (input.staffCode?.trim() || code).toUpperCase();

  let nextShiftId: string | null | undefined = input.shiftId;
  if (input.shiftId !== undefined) {
    const trimmed = input.shiftId?.trim() || null;
    if (trimmed) {
      const shift = await prisma.hrShift.findFirst({
        where: { id: trimmed, organizationId, isActive: true },
        select: { id: true },
      });
      if (!shift) {
        throw new Error("Selected shift is not available in this workspace.");
      }
      nextShiftId = shift.id;
    } else {
      nextShiftId = null;
    }
  }

  const profileData = {
    employeeCode: code,
    employmentType: input.employmentType ?? "FULL_TIME",
    status: input.status ?? "ACTIVE",
    phone: input.phone?.trim() || null,
    emergencyContact: input.emergencyContact?.trim() || null,
    address: input.address?.trim() || null,
    dateOfBirth: input.dateOfBirth ?? null,
    gender: input.gender?.trim() || null,
    pan,
    aadhaar,
    aadhaarLast4: aadhaarLast4From(aadhaar),
    basic: decOrNull(input.basic),
    hra: decOrNull(input.hra),
    specialAllowance: decOrNull(input.specialAllowance),
    esiApplicable: input.esiApplicable ?? false,
    esiNumber: input.esiNumber?.trim() || null,
    pfApplicable: input.pfApplicable ?? false,
    uan: input.uan?.trim() || null,
    pfNumber: input.pfNumber?.trim() || null,
    taxRegime: input.taxRegime?.trim() || null,
    tdsMonthly: decOrNull(input.tdsMonthly),
    bankName: input.bankName?.trim() || null,
    bankAccountNumber: input.bankAccountNumber?.trim() || null,
    ifsc: input.ifsc?.trim().toUpperCase() || null,
    collarCategory: input.collarCategory ?? "WHITE",
    hourlyRate: decOrNull(input.hourlyRate),
  } satisfies Prisma.EmployeeProfileUncheckedUpdateInput;

  const [profile] = await prisma.$transaction([
    prisma.employeeProfile.upsert({
      where: { membershipId: membership.id },
      create: {
        organizationId,
        membershipId: membership.id,
        userId: membership.userId,
        ...profileData,
      },
      update: profileData,
    }),
    prisma.membership.update({
      where: { id: membership.id },
      data: {
        ...(input.designation !== undefined
          ? { designation: input.designation?.trim() || null }
          : {}),
        ...(input.department !== undefined ? { department: input.department } : {}),
        ...(input.dateOfJoining !== undefined
          ? { dateOfJoining: input.dateOfJoining }
          : {}),
        ...(input.monthlySalary !== undefined
          ? { monthlySalary: decOrNull(input.monthlySalary) }
          : {}),
        ...(nextShiftId !== undefined ? { shiftId: nextShiftId } : {}),
        staffCode,
        ...(profileData.status === "EXITED"
          ? { deactivatedAt: new Date() }
          : profileData.status === "ACTIVE"
            ? { deactivatedAt: null }
            : {}),
      },
    }),
  ]);

  if (profileData.status === "ACTIVE") {
    const year = new Date().getFullYear();
    await ensureLeaveBalances(organizationId, membership.userId, year);
  }

  return profile;
}

export async function listEmployeeDocuments(
  organizationId: string,
  employeeProfileId: string,
) {
  return prisma.employeeDocument.findMany({
    where: { organizationId, employeeProfileId },
    select: {
      id: true,
      docType: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      uploadedAt: true,
      uploadedBy: { select: { name: true, email: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });
}

/** Alias used by hr-actions uploadEmployeeDocumentAction. */
export async function uploadEmployeeDocument(params: {
  organizationId: string;
  employeeProfileId: string;
  uploadedById: string;
  docType: EmployeeDocumentType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  data: Buffer | Uint8Array;
}) {
  if (params.fileSize > MAX_DOC_BYTES) {
    throw new Error("File is too large. Maximum size is 8 MB.");
  }
  if (params.mimeType && !ALLOWED_DOC_MIME.has(params.mimeType)) {
    throw new Error("Only PDF, PNG, JPG, or WEBP files are allowed.");
  }

  const profile = await prisma.employeeProfile.findFirst({
    where: {
      id: params.employeeProfileId,
      organizationId: params.organizationId,
    },
    select: { id: true },
  });
  if (!profile) {
    throw new Error("Employee profile not found.");
  }

  const data =
    params.data instanceof Buffer ? params.data : Buffer.from(params.data);

  return prisma.employeeDocument.create({
    data: {
      organizationId: params.organizationId,
      employeeProfileId: params.employeeProfileId,
      uploadedById: params.uploadedById,
      docType: params.docType,
      fileName: params.fileName.slice(0, 255),
      mimeType: params.mimeType || "application/octet-stream",
      fileSize: params.fileSize,
      data,
    },
    select: {
      id: true,
      docType: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      uploadedAt: true,
    },
  });
}

export async function deleteEmployeeDocument(params: {
  organizationId: string;
  documentId: string;
}) {
  const result = await prisma.employeeDocument.deleteMany({
    where: { id: params.documentId, organizationId: params.organizationId },
  });
  if (result.count === 0) {
    throw new Error("Document not found.");
  }
}

export async function getEmployeeDocumentForDownload(params: {
  organizationId: string;
  documentId: string;
}) {
  return prisma.employeeDocument.findFirst({
    where: { id: params.documentId, organizationId: params.organizationId },
  });
}
