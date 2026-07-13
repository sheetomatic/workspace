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
  "/app/hr/holidays",
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
  const visitId = String(formData.get("visitId") ?? "").trim() || null;
  const accuracyMRaw = Number(formData.get("accuracyM"));
  const accuracyM = Number.isFinite(accuracyMRaw) ? accuracyMRaw : null;

  try {
    if (!Number.isFinite(geoLat) || !Number.isFinite(geoLng)) {
      throw new Error("GPS location is required for field check-in.");
    }

    let geoFenceOk: boolean | null = null;
    if (visitId) {
      const visit = await prisma.fieldVisit.findFirst({
        where: {
          id: visitId,
          organizationId: user.organizationId,
          assigneeUserId: user.id,
        },
        select: {
          id: true,
          purpose: true,
          geoLat: true,
          geoLng: true,
          radiusM: true,
        },
      });
      if (!visit) {
        throw new Error("Visit not found or not assigned to you.");
      }

      const { visitGeoFenceOk, haversineMeters } = await import(
        "@/lib/hr/field-pings"
      );
      const {
        parseVisitGeofence,
        isWithinVisitGeofence,
      } = await import("@/lib/hr/field-geofence");

      if (visit.geoLat != null && visit.geoLng != null && visit.radiusM != null) {
        geoFenceOk = visitGeoFenceOk({
          visitGeoLat: visit.geoLat,
          visitGeoLng: visit.geoLng,
          radiusM: visit.radiusM,
          checkLat: geoLat,
          checkLng: geoLng,
        });
        if (geoFenceOk === false) {
          const distanceM = haversineMeters(
            geoLat,
            geoLng,
            visit.geoLat,
            visit.geoLng,
          );
          return hrActionFailure(
            "OUT_OF_LOCATION",
            `Outside visit geofence (${Math.round(distanceM)}m away; allowed ${visit.radiusM}m). Move closer to the client location and try again.`,
          );
        }
      } else {
        const fence = parseVisitGeofence(visit.purpose);
        if (fence) {
          const check = isWithinVisitGeofence(geoLat, geoLng, fence);
          geoFenceOk = check.ok;
          if (!check.ok) {
            return hrActionFailure(
              "OUT_OF_LOCATION",
              `Outside visit geofence (${Math.round(check.distanceM)}m away; allowed ${fence.geoFenceRadiusM}m). Move closer to the client location and try again.`,
            );
          }
        }
      }
    }

    await prisma.fieldCheckIn.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        visitId,
        geoLat,
        geoLng,
        accuracyM,
        clientName: clientName || null,
        activityNote: activityNote || null,
        geoFenceOk,
      },
    });

    revalidateHr();
    return { ok: true };
  } catch (error) {
    return mapCheckInError(error);
  }
}

export async function postFieldLocationPingAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return hrActionFailure("FORBIDDEN", "Sign in required.");
  }

  const geoLat = Number(formData.get("geoLat"));
  const geoLng = Number(formData.get("geoLng"));
  const accuracyM = Number(formData.get("accuracyM"));
  const batteryPct = Number(formData.get("batteryPct"));
  const isMockRaw = formData.get("isMockLocation");

  if (!Number.isFinite(geoLat) || !Number.isFinite(geoLng)) {
    return hrActionFailure("GEO_REQUIRED", "GPS location is required for live ping.");
  }

  try {
    const { postFieldLocationPing } = await import("@/lib/hr/field-pings");
    await postFieldLocationPing({
      organizationId: user.organizationId,
      userId: user.id,
      geoLat,
      geoLng,
      accuracyM: Number.isFinite(accuracyM) ? accuracyM : null,
      batteryPct: Number.isFinite(batteryPct) ? batteryPct : null,
      isMockLocation:
        isMockRaw === "true" || isMockRaw === "1" || isMockRaw === "on"
          ? true
          : isMockRaw === "false" || isMockRaw === "0"
            ? false
            : null,
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not post location ping.";
    if (message.toLowerCase().includes("rate limited")) {
      return hrActionFailure("RATE_LIMITED", message);
    }
    return hrActionFailure("PING_FAILED", message);
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
  const geoLat = Number(formData.get("geoLat"));
  const geoLng = Number(formData.get("geoLng"));
  const radiusRaw = Number(
    formData.get("radiusM") ?? formData.get("geoFenceRadiusM"),
  );
  const radiusM =
    Number.isFinite(radiusRaw) && radiusRaw > 0 ? Math.round(radiusRaw) : null;

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

  const hasFence = Number.isFinite(geoLat) && Number.isFinite(geoLng);
  const { displayVisitPurpose } = await import("@/lib/hr/field-geofence");
  const cleanPurpose = displayVisitPurpose(purpose) ?? (purpose || null);

  await prisma.fieldVisit.create({
    data: {
      organizationId: user.organizationId,
      assigneeUserId,
      clientName,
      purpose: cleanPurpose,
      locationLabel: locationLabel || null,
      geoLat: hasFence ? geoLat : null,
      geoLng: hasFence ? geoLng : null,
      radiusM: hasFence ? radiusM ?? 200 : null,
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
  const workStartTime = String(formData.get("workStartTime") ?? "09:30").trim() || "09:30";
  const workEndTime = String(formData.get("workEndTime") ?? "18:30").trim() || "18:30";
  const lateGraceMinutes = Number(formData.get("lateGraceMinutes") ?? 15);
  const halfDayEnabled = formData.get("halfDayEnabled") === "on";
  const shortLeaveEnabled = formData.get("shortLeaveEnabled") === "on";
  const shortLeaveHours = Number(formData.get("shortLeaveHours") ?? 2);

  await getOrCreateHrSettings(user.organizationId);
  await prisma.workspaceHrSettings.update({
    where: { organizationId: user.organizationId },
    data: {
      officeLat: Number.isFinite(officeLat) ? officeLat : null,
      officeLng: Number.isFinite(officeLng) ? officeLng : null,
      geoFenceRadiusM: Number.isFinite(geoFenceRadiusM) ? geoFenceRadiusM : 200,
      faceRecognitionEnabled,
      workStartTime,
      workEndTime,
      lateGraceMinutes: Number.isFinite(lateGraceMinutes) ? Math.max(0, lateGraceMinutes) : 15,
      halfDayEnabled,
      shortLeaveEnabled,
      shortLeaveHours: Number.isFinite(shortLeaveHours) ? Math.max(0.25, shortLeaveHours) : 2,
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
    | "SHORT_LEAVE"
    | "ON_LEAVE"
    | "HOLIDAY";
  const notes = String(formData.get("notes") ?? "").trim();
  const otHoursRaw = Number(formData.get("otHours"));

  if (!targetUserId || !workDateRaw) {
    return hrActionFailure("INVALID_INPUT", "Employee and date are required.");
  }
  if (
    !["PRESENT", "ABSENT", "HALF_DAY", "SHORT_LEAVE", "ON_LEAVE", "HOLIDAY"].includes(
      status,
    )
  ) {
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
      otHours: Number.isFinite(otHoursRaw) ? otHoursRaw : undefined,
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not mark attendance.";
    return hrActionFailure("MARK_FAILED", message);
  }
}

export async function verifyAttendanceAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "MANAGER")) {
    return hrActionFailure("FORBIDDEN", "Manager access required to verify attendance.");
  }

  const recordId = String(formData.get("recordId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim().toLowerCase();
  const notes = String(formData.get("notes") ?? "").trim();
  const otHoursRaw = Number(formData.get("otHours"));

  if (!recordId || !["approve", "reject"].includes(decision)) {
    return hrActionFailure("INVALID_INPUT", "Record and approve/reject decision are required.");
  }

  try {
    const { verifyAttendanceRecord } = await import("@/lib/hr/hr-store");
    await verifyAttendanceRecord({
      organizationId: user.organizationId,
      recordId,
      reviewerId: user.id,
      approve: decision === "approve",
      otHours: Number.isFinite(otHoursRaw) ? otHoursRaw : undefined,
      notes: notes || undefined,
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not verify attendance.";
    return hrActionFailure("VERIFY_FAILED", message);
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

export async function saveHrShiftAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    throw new Error("Admin only.");
  }

  const id = String(formData.get("id") ?? "").trim() || undefined;
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const startTime = String(formData.get("startTime") ?? "09:30").trim();
  const endTime = String(formData.get("endTime") ?? "18:30").trim();
  const isDefault = formData.get("isDefault") === "on";
  const isActive = id
    ? formData.get("isActive") === "on"
    : true;

  const { saveHrShift } = await import("@/lib/hr/shifts");
  await saveHrShift(user.organizationId, {
    id,
    name,
    code,
    startTime,
    endTime,
    isDefault,
    isActive,
  });

  revalidateHr();
  revalidatePath("/app/team");
  revalidatePath("/app/hr/employees");
}

export async function deleteHrShiftAction(shiftId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    throw new Error("Admin only.");
  }

  const { deleteHrShift } = await import("@/lib/hr/shifts");
  await deleteHrShift(user.organizationId, shiftId.trim());

  revalidateHr();
  revalidatePath("/app/team");
  revalidatePath("/app/hr/employees");
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
      collarCategory:
        String(formData.get("collarCategory") ?? "WHITE").trim() === "BLUE"
          ? "BLUE"
          : "WHITE",
      hourlyRate: parseOptionalNumber(formData.get("hourlyRate")),
      shiftId: String(formData.get("shiftId") ?? "").trim() || null,
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
  if (!user || !hasWorkspaceModule(user, "HR")) {
    return hrActionFailure("FORBIDDEN", "HR access required to upload documents.");
  }

  const employeeProfileId = String(formData.get("employeeProfileId") ?? "").trim();
  const docTypeRaw = String(formData.get("docType") ?? "OTHER").trim();
  if (!employeeProfileId) {
    return hrActionFailure("INVALID_INPUT", "Employee profile is required.");
  }
  if (!["AADHAAR", "PAN", "OFFER_LETTER", "CONTRACT", "EDUCATION_QUALIFICATION", "CV", "WORK_EXPERIENCE", "NOC_RESIGNATION", "OTHER"].includes(docTypeRaw)) {
    return hrActionFailure("INVALID_INPUT", "Invalid document type.");
  }

  const profile = await prisma.employeeProfile.findFirst({
    where: { id: employeeProfileId, organizationId: user.organizationId },
    select: { userId: true },
  });
  if (!profile) {
    return hrActionFailure("INVALID_INPUT", "Employee profile not found.");
  }

  const isAdmin = hasMinimumRole(user.role, "ADMIN");
  const isSelf = profile.userId === user.id;
  if (!isAdmin && !isSelf) {
    return hrActionFailure(
      "FORBIDDEN",
      "Only an admin or the employee can upload documents on this profile.",
    );
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
        | "EDUCATION_QUALIFICATION"
        | "CV"
        | "WORK_EXPERIENCE"
        | "NOC_RESIGNATION"
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
  if (!user || !hasWorkspaceModule(user, "HR")) {
    return hrActionFailure("FORBIDDEN", "HR access required to delete documents.");
  }

  const documentId = String(formData.get("documentId") ?? "").trim();
  if (!documentId) {
    return hrActionFailure("INVALID_INPUT", "Document id is required.");
  }

  const document = await prisma.employeeDocument.findFirst({
    where: { id: documentId, organizationId: user.organizationId },
    select: {
      id: true,
      employeeProfile: { select: { userId: true } },
    },
  });
  if (!document) {
    return hrActionFailure("INVALID_INPUT", "Document not found.");
  }

  const isAdmin = hasMinimumRole(user.role, "ADMIN");
  const isSelf = document.employeeProfile.userId === user.id;
  if (!isAdmin && !isSelf) {
    return hrActionFailure(
      "FORBIDDEN",
      "Only an admin or the employee can delete documents on this profile.",
    );
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

// ── Holidays ──────────────────────────────────────────────────────────────

export async function createHolidayAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return hrActionFailure("FORBIDDEN", "Admin access required to manage holidays.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "").trim();
  const isOptional = formData.get("isOptional") === "on" || formData.get("isOptional") === "true";
  if (!name || !dateRaw) {
    return hrActionFailure("INVALID_INPUT", "Holiday name and date are required.");
  }

  try {
    const { createHoliday } = await import("@/lib/hr/holidays");
    await createHoliday({
      organizationId: user.organizationId,
      date: new Date(dateRaw),
      name,
      isOptional,
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create holiday.";
    return hrActionFailure("HOLIDAY_FAILED", message);
  }
}

export async function deleteHolidayAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return hrActionFailure("FORBIDDEN", "Admin access required to manage holidays.");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return hrActionFailure("INVALID_INPUT", "Holiday id is required.");
  }

  try {
    const { deleteHoliday } = await import("@/lib/hr/holidays");
    await deleteHoliday({ organizationId: user.organizationId, id });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete holiday.";
    return hrActionFailure("HOLIDAY_FAILED", message);
  }
}

export async function updateHolidayAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return hrActionFailure("FORBIDDEN", "Admin access required to manage holidays.");
  }

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const isOptionalRaw = formData.get("isOptional");
  if (!id) {
    return hrActionFailure("INVALID_INPUT", "Holiday id is required.");
  }

  try {
    const { updateHoliday } = await import("@/lib/hr/holidays");
    await updateHoliday({
      organizationId: user.organizationId,
      id,
      ...(name ? { name } : {}),
      ...(isOptionalRaw != null
        ? {
            isOptional:
              isOptionalRaw === "on" ||
              isOptionalRaw === "true" ||
              isOptionalRaw === "1",
          }
        : {}),
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update holiday.";
    return hrActionFailure("HOLIDAY_FAILED", message);
  }
}

// ── OD / WFH exceptions ───────────────────────────────────────────────────

export async function submitAttendanceExceptionAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return hrActionFailure("FORBIDDEN", "Sign in required.");
  }

  const exceptionType = String(formData.get("exceptionType") ?? "").trim().toUpperCase();
  const startRaw = String(formData.get("startDate") ?? "").trim();
  const endRaw = String(formData.get("endDate") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  // Swaps use submitSwapRequestAction — keep OD/WFH here only.
  if (exceptionType === "LEAVE_SWAP" || exceptionType === "OFF_DAY_SWAP") {
    return submitSwapRequestAction(formData);
  }
  if (exceptionType !== "OD" && exceptionType !== "WFH") {
    return hrActionFailure("INVALID_INPUT", "Select OD or WFH.");
  }
  if (!startRaw || !endRaw) {
    return hrActionFailure("INVALID_INPUT", "Start and end dates are required.");
  }

  try {
    const { submitAttendanceException } = await import(
      "@/lib/hr/attendance-exceptions"
    );
    await submitAttendanceException({
      organizationId: user.organizationId,
      userId: user.id,
      exceptionType: exceptionType as "OD" | "WFH",
      startDate: new Date(startRaw),
      endDate: new Date(endRaw),
      reason: reason || null,
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not submit request.";
    return hrActionFailure("EXCEPTION_FAILED", message);
  }
}

export async function reviewAttendanceExceptionAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "MANAGER")) {
    return hrActionFailure("FORBIDDEN", "Manager access required to review requests.");
  }

  const id = String(formData.get("id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim().toUpperCase();
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim();

  if (!id || (decision !== "APPROVED" && decision !== "REJECTED")) {
    return hrActionFailure("INVALID_INPUT", "Invalid review decision.");
  }

  // If id is a swap request, route to swap review (Frontend may share one queue).
  const swap = await prisma.hrSwapRequest.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { id: true },
  });
  if (swap) {
    return reviewSwapRequestAction(formData);
  }

  try {
    const {
      approveAttendanceException,
      rejectAttendanceException,
    } = await import("@/lib/hr/attendance-exceptions");
    if (decision === "APPROVED") {
      await approveAttendanceException({
        organizationId: user.organizationId,
        requestId: id,
        reviewerId: user.id,
        reviewNotes: reviewNotes || null,
      });
    } else {
      await rejectAttendanceException({
        organizationId: user.organizationId,
        requestId: id,
        reviewerId: user.id,
        reviewNotes: reviewNotes || null,
      });
    }
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not review request.";
    return hrActionFailure("EXCEPTION_REVIEW_FAILED", message);
  }
}

// ── Leave / off-day swap ──────────────────────────────────────────────────

export async function submitSwapRequestAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return hrActionFailure("FORBIDDEN", "Sign in required.");
  }

  const swapType = String(
    formData.get("swapType") ?? formData.get("exceptionType") ?? "",
  )
    .trim()
    .toUpperCase();
  const fromRaw = String(
    formData.get("fromDate") ?? formData.get("startDate") ?? "",
  ).trim();
  const toRaw = String(
    formData.get("toDate") ?? formData.get("endDate") ?? "",
  ).trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const leaveRequestId = String(formData.get("leaveRequestId") ?? "").trim();

  if (swapType !== "LEAVE_SWAP" && swapType !== "OFF_DAY_SWAP") {
    return hrActionFailure(
      "INVALID_INPUT",
      "Select LEAVE_SWAP or OFF_DAY_SWAP.",
    );
  }
  if (!fromRaw || !toRaw) {
    return hrActionFailure("INVALID_INPUT", "From and to dates are required.");
  }

  try {
    const { submitSwapRequest } = await import("@/lib/hr/swap-requests");
    await submitSwapRequest({
      organizationId: user.organizationId,
      userId: user.id,
      swapType: swapType as "LEAVE_SWAP" | "OFF_DAY_SWAP",
      fromDate: new Date(fromRaw),
      toDate: new Date(toRaw),
      reason: reason || null,
      leaveRequestId: leaveRequestId || null,
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not submit swap request.";
    return hrActionFailure("SWAP_FAILED", message);
  }
}

export async function reviewSwapRequestAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "MANAGER")) {
    return hrActionFailure("FORBIDDEN", "Manager access required to review swaps.");
  }

  const id = String(formData.get("id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim().toUpperCase();
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim();

  if (!id || (decision !== "APPROVED" && decision !== "REJECTED")) {
    return hrActionFailure("INVALID_INPUT", "Invalid review decision.");
  }

  try {
    const { approveSwapRequest, rejectSwapRequest } = await import(
      "@/lib/hr/swap-requests"
    );
    if (decision === "APPROVED") {
      await approveSwapRequest({
        organizationId: user.organizationId,
        requestId: id,
        reviewerId: user.id,
        reviewNotes: reviewNotes || null,
      });
    } else {
      await rejectSwapRequest({
        organizationId: user.organizationId,
        requestId: id,
        reviewerId: user.id,
        reviewNotes: reviewNotes || null,
      });
    }
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not review swap request.";
    return hrActionFailure("SWAP_REVIEW_FAILED", message);
  }
}

// ── Leave allocation + policy ─────────────────────────────────────────────

export async function setLeaveBalanceAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return hrActionFailure("FORBIDDEN", "Admin access required to allocate leave.");
  }

  const targetUserId = String(formData.get("userId") ?? "").trim();
  const leaveType = String(formData.get("leaveType") ?? "").trim().toUpperCase();
  const year = Number(formData.get("year") ?? new Date().getUTCFullYear());
  const balanceDays = Number(formData.get("balanceDays"));

  const validTypes = ["CASUAL", "SICK", "EARNED", "UNPAID", "COMP_OFF"];
  if (!targetUserId || !validTypes.includes(leaveType)) {
    return hrActionFailure("INVALID_INPUT", "Employee and leave type are required.");
  }
  if (!Number.isFinite(year) || !Number.isFinite(balanceDays)) {
    return hrActionFailure("INVALID_INPUT", "Year and balance days are required.");
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: targetUserId,
        organizationId: user.organizationId,
      },
    },
    select: { id: true },
  });
  if (!membership) {
    return hrActionFailure("INVALID_INPUT", "Employee not found in this workspace.");
  }

  try {
    const { setLeaveBalanceAllocation } = await import("@/lib/hr/payroll");
    await setLeaveBalanceAllocation({
      organizationId: user.organizationId,
      userId: targetUserId,
      leaveType: leaveType as "CASUAL" | "SICK" | "EARNED" | "UNPAID" | "COMP_OFF",
      year,
      balanceDays,
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update leave balance.";
    return hrActionFailure("LEAVE_ALLOC_FAILED", message);
  }
}

export async function upsertLeavePolicyAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return hrActionFailure("FORBIDDEN", "Admin access required to edit leave policy.");
  }

  const leaveType = String(formData.get("leaveType") ?? "").trim().toUpperCase();
  const year = Number(formData.get("year") ?? new Date().getUTCFullYear());
  const defaultDays = Number(formData.get("defaultDays"));
  const validTypes = ["CASUAL", "SICK", "EARNED", "UNPAID", "COMP_OFF"];
  if (!validTypes.includes(leaveType)) {
    return hrActionFailure("INVALID_INPUT", "Invalid leave type.");
  }
  if (!Number.isFinite(year) || !Number.isFinite(defaultDays)) {
    return hrActionFailure("INVALID_INPUT", "Year and default days are required.");
  }

  try {
    const { upsertLeavePolicy } = await import("@/lib/hr/payroll");
    await upsertLeavePolicy({
      organizationId: user.organizationId,
      leaveType: leaveType as "CASUAL" | "SICK" | "EARNED" | "UNPAID" | "COMP_OFF",
      year,
      defaultDays,
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save leave policy.";
    return hrActionFailure("LEAVE_POLICY_FAILED", message);
  }
}

// ── Onboarding ────────────────────────────────────────────────────────────

export async function completeOnboardingAction(
  formData: FormData,
): Promise<HrActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return hrActionFailure("FORBIDDEN", "Sign in required.");
  }

  const employeeProfileId = String(formData.get("employeeProfileId") ?? "").trim();
  const skipIncomplete =
    formData.get("skipIncomplete") === "on" ||
    formData.get("skipIncomplete") === "true";
  const educationSummary = String(formData.get("educationSummary") ?? "").trim();
  const experienceSummary = String(formData.get("experienceSummary") ?? "").trim();

  if (!employeeProfileId) {
    return hrActionFailure("INVALID_INPUT", "Employee profile is required.");
  }

  const profile = await prisma.employeeProfile.findFirst({
    where: { id: employeeProfileId, organizationId: user.organizationId },
    select: { userId: true },
  });
  if (!profile) {
    return hrActionFailure("INVALID_INPUT", "Employee profile not found.");
  }

  const isAdmin = hasMinimumRole(user.role, "ADMIN");
  const isSelf = profile.userId === user.id;
  if (!isAdmin && !isSelf) {
    return hrActionFailure("FORBIDDEN", "Not allowed to complete this onboarding.");
  }
  if (skipIncomplete && !isAdmin) {
    return hrActionFailure("FORBIDDEN", "Only admins can skip incomplete documents.");
  }

  try {
    const { completeOnboarding } = await import("@/lib/hr/onboarding");
    await completeOnboarding({
      organizationId: user.organizationId,
      employeeProfileId,
      skipIncomplete,
      educationSummary: educationSummary || null,
      experienceSummary: experienceSummary || null,
      actorIsAdmin: isAdmin,
    });
    revalidateHr();
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not complete onboarding.";
    return hrActionFailure("ONBOARDING_FAILED", message);
  }
}

