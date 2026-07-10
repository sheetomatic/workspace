"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import {
  checkInAttendance,
  checkOutAttendance,
  getOrCreateHrSettings,
} from "@/lib/hr/hr-store";
import {
  hrActionFailure,
  mapCheckInError,
  type HrActionResult,
} from "@/lib/hr/hr-result";

const HR_PATHS = [
  "/app/hr",
  "/app/hr/attendance",
  "/app/hr/leave",
  "/app/hr/payroll",
  "/app/hr/employees",
  "/app/hr/field",
  "/app/hr/hiring",
];

function revalidateHr() {
  for (const path of HR_PATHS) {
    revalidatePath(path);
  }
}

export async function recordCheckInAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return mapCheckInError(new Error("Sign in required."));
  }

  const geoLat = Number(formData.get("geoLat"));
  const geoLng = Number(formData.get("geoLng"));
  const siteId = String(formData.get("siteId") ?? "").trim() || null;

  try {
    await checkInAttendance({
      user,
      siteId,
      geoLat: Number.isFinite(geoLat) ? geoLat : undefined,
      geoLng: Number.isFinite(geoLng) ? geoLng : undefined,
      method: Number.isFinite(geoLat) ? "GEO" : "WEB",
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    return mapCheckInError(error);
  }
}

export async function recordCheckOutAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Sign in required.");
  }

  await checkOutAttendance(user);
  revalidateHr();
}

export async function submitLeaveRequestAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) {
    return;
  }

  const leaveType = String(formData.get("leaveType") ?? "CASUAL");
  const startRaw = new Date(String(formData.get("startDate")));
  const endRaw = new Date(String(formData.get("endDate")));
  const reason = String(formData.get("reason") ?? "").trim();

  if (Number.isNaN(startRaw.getTime()) || Number.isNaN(endRaw.getTime())) {
    return;
  }
  if (endRaw < startRaw) {
    return;
  }

  const startDate = new Date(startRaw);
  startDate.setUTCHours(12, 0, 0, 0);
  const endDate = new Date(endRaw);
  endDate.setUTCHours(12, 0, 0, 0);

  // Align with approve path: only weekdays count toward leave days.
  let days = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      days += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (days < 1) {
    return;
  }

  const year = startDate.getUTCFullYear();
  const { ensureLeaveBalances } = await import("@/lib/hr/payroll");
  await ensureLeaveBalances(user.organizationId, user.id, year);

  await prisma.leaveRequest.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      leaveType: leaveType as "CASUAL" | "SICK" | "EARNED" | "UNPAID" | "COMP_OFF",
      startDate,
      endDate,
      days,
      reason: reason || null,
    },
  });

  revalidateHr();
}

export async function reviewLeaveRequestAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "MANAGER")) {
    return;
  }

  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return;
  }

  const leaveRequest = await prisma.leaveRequest.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { userId: true, status: true },
  });
  if (!leaveRequest || leaveRequest.status !== "PENDING") {
    return;
  }
  if (leaveRequest.userId === user.id) {
    throw new Error("You cannot approve or reject your own leave request.");
  }

  const { applyApprovedLeave, rejectLeaveRequest } = await import("@/lib/hr/payroll");

  if (decision === "APPROVED") {
    await applyApprovedLeave({
      organizationId: user.organizationId,
      leaveRequestId: id,
      reviewerId: user.id,
    });
  } else {
    await rejectLeaveRequest({
      organizationId: user.organizationId,
      leaveRequestId: id,
      reviewerId: user.id,
    });
  }

  revalidateHr();
}

export async function recordFieldCheckInAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return mapCheckInError(new Error("Sign in required."));
  }

  const geoLat = Number(formData.get("geoLat"));
  const geoLng = Number(formData.get("geoLng"));
  const clientName = String(formData.get("clientName") ?? "").trim();
  const activityNote = String(formData.get("activityNote") ?? "").trim();

  try {
    if (!Number.isFinite(geoLat) || !Number.isFinite(geoLng)) {
      throw new Error("GPS location is required for field check-in.");
    }

    await prisma.fieldCheckIn.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        geoLat,
        geoLng,
        clientName: clientName || null,
        activityNote: activityNote || null,
      },
    });

    revalidateHr();
    return { ok: true };
  } catch (error) {
    return mapCheckInError(error);
  }
}

export async function createFieldVisitAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "MANAGER")) {
    return;
  }

  const assigneeUserId = String(formData.get("assigneeUserId") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  const locationLabel = String(formData.get("locationLabel") ?? "").trim();

  if (!clientName || !assigneeUserId) {
    return;
  }

  const assigneeMembership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: assigneeUserId,
        organizationId: user.organizationId,
      },
    },
    select: { id: true, deactivatedAt: true },
  });
  if (!assigneeMembership || assigneeMembership.deactivatedAt) {
    return;
  }

  await prisma.fieldVisit.create({
    data: {
      organizationId: user.organizationId,
      assigneeUserId,
      clientName,
      purpose: purpose || null,
      locationLabel: locationLabel || null,
      status: "PLANNED",
    },
  });

  revalidateHr();
}

export async function createJobOpeningAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return;
  }

  const title = String(formData.get("title") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title) {
    return;
  }

  await prisma.jobOpening.create({
    data: {
      organizationId: user.organizationId,
      title,
      location: location || null,
      description: description || null,
    },
  });

  revalidateHr();
}

export async function addCandidateAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return;
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const jobOpeningId = String(formData.get("jobOpeningId") ?? "").trim();

  if (!fullName) {
    return;
  }

  await prisma.candidate.create({
    data: {
      organizationId: user.organizationId,
      fullName,
      email: email || null,
      phone: phone || null,
      jobOpeningId: jobOpeningId || null,
      ownerUserId: user.id,
      stage: "APPLIED",
    },
  });

  revalidateHr();
}

export async function updateHrSettingsAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return;
  }

  const officeLat = Number(formData.get("officeLat"));
  const officeLng = Number(formData.get("officeLng"));
  const geoFenceRadiusM = Number(formData.get("geoFenceRadiusM") ?? 200);
  const faceRecognitionEnabled = formData.get("faceRecognitionEnabled") === "on";

  await getOrCreateHrSettings(user.organizationId);
  await prisma.workspaceHrSettings.update({
    where: { organizationId: user.organizationId },
    data: {
      officeLat: Number.isFinite(officeLat) ? officeLat : null,
      officeLng: Number.isFinite(officeLng) ? officeLng : null,
      geoFenceRadiusM: Number.isFinite(geoFenceRadiusM) ? geoFenceRadiusM : 200,
      faceRecognitionEnabled,
    },
  });

  revalidateHr();
  revalidatePath("/app/team");
}

export async function createPayrollRunAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (
    !user ||
    !hasWorkspaceModule(user, "HR") ||
    !hasMinimumRole(user.role, "ADMIN")
  ) {
    return hrActionFailure("FORBIDDEN", "Admin access required to generate payroll.");
  }

  const periodStart = new Date(String(formData.get("periodStart")));
  const periodEnd = new Date(String(formData.get("periodEnd")));
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return hrActionFailure("INVALID_PERIOD", "Enter a valid period start and end.");
  }
  if (periodEnd < periodStart) {
    return hrActionFailure("INVALID_PERIOD", "Period end must be on or after period start.");
  }

  periodStart.setUTCHours(12, 0, 0, 0);
  periodEnd.setUTCHours(12, 0, 0, 0);

  try {
    const { generatePayrollFromAttendance } = await import("@/lib/hr/payroll");
    await generatePayrollFromAttendance({
      organizationId: user.organizationId,
      periodStart,
      periodEnd,
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not generate payroll.";
    return hrActionFailure("PAYROLL_FAILED", message);
  }
}

export async function markAttendanceDayAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "MANAGER")) {
    return hrActionFailure("FORBIDDEN", "Manager access required to mark attendance.");
  }

  const targetUserId = String(formData.get("userId") ?? "").trim();
  const workDateRaw = String(formData.get("workDate") ?? "").trim();
  const status = String(formData.get("status") ?? "PRESENT").trim() as
    | "PRESENT"
    | "ABSENT"
    | "HALF_DAY"
    | "ON_LEAVE"
    | "HOLIDAY";
  const notes = String(formData.get("notes") ?? "").trim();

  if (!targetUserId || !workDateRaw) {
    return hrActionFailure("INVALID_INPUT", "Employee and date are required.");
  }
  if (!["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY"].includes(status)) {
    return hrActionFailure("INVALID_INPUT", "Invalid attendance status.");
  }

  try {
    const { markAttendanceDay } = await import("@/lib/hr/payroll");
    await markAttendanceDay({
      organizationId: user.organizationId,
      actorUserId: user.id,
      userId: targetUserId,
      workDate: new Date(workDateRaw),
      status,
      notes: notes || undefined,
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not mark attendance.";
    return hrActionFailure("MARK_FAILED", message);
  }
}

async function requireSuperAdminAttendanceActor() {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin) {
    throw new Error("Only super admins can change attendance rows.");
  }
  return user;
}

function parseOptionalDateTime(raw: string | null | undefined) {
  const value = raw?.trim() ?? "";
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Enter a valid date and time.");
  }
  return parsed;
}

function parseGeoFenceOk(raw: string | null | undefined): boolean | null {
  const value = raw?.trim() ?? "";
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

export async function updateAttendanceRecordAction(
  formData: FormData,
): Promise<void> {
  const user = await requireSuperAdminAttendanceActor();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Attendance record not found.");
  }

  const existing = await prisma.attendanceRecord.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) {
    throw new Error("Attendance record not found.");
  }

  const method = String(formData.get("method") ?? existing.method).trim();
  if (!["WEB", "GEO", "FACE"].includes(method)) {
    throw new Error("Invalid attendance method.");
  }

  await prisma.attendanceRecord.update({
    where: { id },
    data: {
      checkInAt: parseOptionalDateTime(formData.get("checkInAt")?.toString()),
      checkOutAt: parseOptionalDateTime(formData.get("checkOutAt")?.toString()),
      method: method as "WEB" | "GEO" | "FACE",
      geoFenceOk: parseGeoFenceOk(formData.get("geoFenceOk")?.toString()),
      notes: String(formData.get("notes") ?? "").trim() || null,
      markedById: user.id,
    },
  });

  revalidateHr();
}

export async function deleteAttendanceRecordAction(recordId: string): Promise<void> {
  const user = await requireSuperAdminAttendanceActor();
  const id = recordId.trim();
  if (!id) {
    throw new Error("Attendance record not found.");
  }

  const deleted = await prisma.attendanceRecord.deleteMany({
    where: { id, organizationId: user.organizationId },
  });
  if (deleted.count === 0) {
    throw new Error("Attendance record not found.");
  }

  revalidateHr();
}

export async function saveHrWorkSiteAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    throw new Error("Admin only.");
  }

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const geoFenceRadiusM = Number(formData.get("geoFenceRadiusM") ?? 200);

  if (!name) {
    throw new Error("Site name is required.");
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Latitude and longitude are required.");
  }

  const data = {
    name,
    lat,
    lng,
    geoFenceRadiusM: Number.isFinite(geoFenceRadiusM) ? geoFenceRadiusM : 200,
  };

  if (id) {
    await prisma.hrWorkSite.updateMany({
      where: { id, organizationId: user.organizationId },
      data,
    });
  } else {
    const count = await prisma.hrWorkSite.count({
      where: { organizationId: user.organizationId },
    });
    await prisma.hrWorkSite.create({
      data: {
        organizationId: user.organizationId,
        sortOrder: count,
        ...data,
      },
    });
  }

  revalidateHr();
  revalidatePath("/app/team");
}

export async function deleteHrWorkSiteAction(siteId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    throw new Error("Admin only.");
  }

  await prisma.hrWorkSite.deleteMany({
    where: { id: siteId.trim(), organizationId: user.organizationId },
  });

  revalidateHr();
  revalidatePath("/app/team");
}

function parseOptionalNumber(raw: FormDataEntryValue | null): number | null | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalDate(raw: FormDataEntryValue | null): Date | null | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (s === "") return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

export async function upsertEmployeeProfileAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (
    !user ||
    !hasWorkspaceModule(user, "HR") ||
    !hasMinimumRole(user.role, "ADMIN")
  ) {
    return hrActionFailure("FORBIDDEN", "Admin access required to edit employee profiles.");
  }

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const employeeCode = String(formData.get("employeeCode") ?? "").trim();
  if (!membershipId || !employeeCode) {
    return hrActionFailure("INVALID_INPUT", "Membership and employee code are required.");
  }

  const employmentTypeRaw = String(formData.get("employmentType") ?? "FULL_TIME").trim();
  const statusRaw = String(formData.get("status") ?? "ACTIVE").trim();
  if (!["FULL_TIME", "PART_TIME", "CONTRACT"].includes(employmentTypeRaw)) {
    return hrActionFailure("INVALID_INPUT", "Invalid employment type.");
  }
  if (!["ACTIVE", "EXITED"].includes(statusRaw)) {
    return hrActionFailure("INVALID_INPUT", "Invalid employee status.");
  }

  const departmentRaw = String(formData.get("department") ?? "").trim();
  const validDepartments = ["OPERATIONS", "SALES", "ACCOUNTS", "ADMIN", "GENERAL"] as const;
  const department =
    departmentRaw === ""
      ? null
      : validDepartments.includes(departmentRaw as (typeof validDepartments)[number])
        ? (departmentRaw as (typeof validDepartments)[number])
        : undefined;
  if (departmentRaw !== "" && department === undefined) {
    return hrActionFailure("INVALID_INPUT", "Invalid department.");
  }

  try {
    const { upsertEmployeeProfile } = await import("@/lib/hr/employees");
    await upsertEmployeeProfile(user.organizationId, {
      membershipId,
      employeeCode,
      employmentType: employmentTypeRaw as "FULL_TIME" | "PART_TIME" | "CONTRACT",
      status: statusRaw as "ACTIVE" | "EXITED",
      phone: String(formData.get("phone") ?? "").trim() || null,
      emergencyContact: String(formData.get("emergencyContact") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      dateOfBirth: parseOptionalDate(formData.get("dateOfBirth")),
      gender: String(formData.get("gender") ?? "").trim() || null,
      pan: String(formData.get("pan") ?? "").trim() || null,
      aadhaar: String(formData.get("aadhaar") ?? "").trim() || null,
      basic: parseOptionalNumber(formData.get("basic")),
      hra: parseOptionalNumber(formData.get("hra")),
      specialAllowance: parseOptionalNumber(formData.get("specialAllowance")),
      esiApplicable: formData.get("esiApplicable") === "on" || formData.get("esiApplicable") === "true",
      esiNumber: String(formData.get("esiNumber") ?? "").trim() || null,
      pfApplicable: formData.get("pfApplicable") === "on" || formData.get("pfApplicable") === "true",
      uan: String(formData.get("uan") ?? "").trim() || null,
      pfNumber: String(formData.get("pfNumber") ?? "").trim() || null,
      taxRegime: String(formData.get("taxRegime") ?? "").trim() || null,
      tdsMonthly: parseOptionalNumber(formData.get("tdsMonthly")),
      bankName: String(formData.get("bankName") ?? "").trim() || null,
      bankAccountNumber: String(formData.get("bankAccountNumber") ?? "").trim() || null,
      ifsc: String(formData.get("ifsc") ?? "").trim() || null,
      designation: String(formData.get("designation") ?? "").trim() || null,
      department,
      dateOfJoining: parseOptionalDate(formData.get("dateOfJoining")),
      monthlySalary: parseOptionalNumber(formData.get("monthlySalary")),
      staffCode: String(formData.get("staffCode") ?? employeeCode).trim() || employeeCode,
    });
    revalidateHr();
    revalidatePath("/app/team");
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save employee profile.";
    return hrActionFailure("EMPLOYEE_SAVE_FAILED", message);
  }
}

export async function uploadEmployeeDocumentAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (
    !user ||
    !hasWorkspaceModule(user, "HR") ||
    !hasMinimumRole(user.role, "ADMIN")
  ) {
    return hrActionFailure("FORBIDDEN", "Admin access required to upload employee documents.");
  }

  const employeeProfileId = String(formData.get("employeeProfileId") ?? "").trim();
  const docTypeRaw = String(formData.get("docType") ?? "OTHER").trim();
  if (!employeeProfileId) {
    return hrActionFailure("INVALID_INPUT", "Employee profile is required.");
  }
  if (!["AADHAAR", "PAN", "OFFER_LETTER", "CONTRACT", "OTHER"].includes(docTypeRaw)) {
    return hrActionFailure("INVALID_INPUT", "Invalid document type.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return hrActionFailure("INVALID_INPUT", "Choose a file to upload.");
  }

  try {
    const { uploadEmployeeDocument } = await import("@/lib/hr/employees");
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadEmployeeDocument({
      organizationId: user.organizationId,
      employeeProfileId,
      uploadedById: user.id,
      docType: docTypeRaw as
        | "AADHAAR"
        | "PAN"
        | "OFFER_LETTER"
        | "CONTRACT"
        | "OTHER",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      data: new Uint8Array(buffer),
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not upload document.";
    return hrActionFailure("DOC_UPLOAD_FAILED", message);
  }
}

export async function deleteEmployeeDocumentAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (
    !user ||
    !hasWorkspaceModule(user, "HR") ||
    !hasMinimumRole(user.role, "ADMIN")
  ) {
    return hrActionFailure("FORBIDDEN", "Admin access required to delete employee documents.");
  }

  const documentId = String(formData.get("documentId") ?? "").trim();
  if (!documentId) {
    return hrActionFailure("INVALID_INPUT", "Document id is required.");
  }

  try {
    const { deleteEmployeeDocument } = await import("@/lib/hr/employees");
    await deleteEmployeeDocument({
      organizationId: user.organizationId,
      documentId,
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete document.";
    return hrActionFailure("DOC_DELETE_FAILED", message);
  }
}

/** Server-page helper: ADMIN+ or self. Returns null if forbidden / missing. */
export async function getSalarySlipAction(
  lineId: string,
): Promise<import("@/lib/hr/salary-slip").SalarySlipData | null> {
  const user = await getSessionUser();
  if (!user || !hasWorkspaceModule(user, "HR")) {
    return null;
  }
  const { getSalarySlipData } = await import("@/lib/hr/salary-slip");
  return getSalarySlipData(user.organizationId, lineId.trim(), {
    userId: user.id,
    role: user.role,
  });
}
