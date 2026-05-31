"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import {
  checkInAttendance,
  checkOutAttendance,
  getOrCreateHrSettings,
} from "@/lib/hr/hr-store";

const HR_PATHS = [
  "/app/hr",
  "/app/hr/attendance",
  "/app/hr/leave",
  "/app/hr/payroll",
  "/app/hr/field",
  "/app/hr/hiring",
];

function revalidateHr() {
  for (const path of HR_PATHS) {
    revalidatePath(path);
  }
}

export async function recordCheckInAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) {
    return;
  }

  const geoLat = Number(formData.get("geoLat"));
  const geoLng = Number(formData.get("geoLng"));

  await checkInAttendance({
    user,
    geoLat: Number.isFinite(geoLat) ? geoLat : undefined,
    geoLng: Number.isFinite(geoLng) ? geoLng : undefined,
    method: Number.isFinite(geoLat) ? "GEO" : "WEB",
  });
  revalidateHr();
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
  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  const reason = String(formData.get("reason") ?? "").trim();

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return;
  }

  const days =
    Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

  await prisma.leaveRequest.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      leaveType: leaveType as "CASUAL" | "SICK" | "EARNED" | "UNPAID" | "COMP_OFF",
      startDate,
      endDate,
      days: Math.max(days, 1),
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

  await prisma.leaveRequest.updateMany({
    where: { id, organizationId: user.organizationId },
    data: {
      status: decision,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  revalidateHr();
}

export async function recordFieldCheckInAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) {
    return;
  }

  const geoLat = Number(formData.get("geoLat"));
  const geoLng = Number(formData.get("geoLng"));
  if (!Number.isFinite(geoLat) || !Number.isFinite(geoLng)) {
    throw new Error("Location required");
  }

  const clientName = String(formData.get("clientName") ?? "").trim();
  const activityNote = String(formData.get("activityNote") ?? "").trim();

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
}

export async function createFieldVisitAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "MANAGER")) {
    return;
  }

  const assigneeUserId = String(formData.get("assigneeUserId"));
  const clientName = String(formData.get("clientName") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  const locationLabel = String(formData.get("locationLabel") ?? "").trim();

  if (!clientName) {
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

export async function createPayrollRunAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return;
  }

  const periodStart = new Date(String(formData.get("periodStart")));
  const periodEnd = new Date(String(formData.get("periodEnd")));
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return;
  }

  const employeeCount = await prisma.attendanceRecord.groupBy({
    by: ["userId"],
    where: {
      organizationId: user.organizationId,
      workDate: { gte: periodStart, lte: periodEnd },
      status: "PRESENT",
    },
  });

  await prisma.payrollRun.create({
    data: {
      organizationId: user.organizationId,
      periodStart,
      periodEnd,
      employeeCount: employeeCount.length,
      status: "DRAFT",
      notes: "Generated from attendance records. Salary calculation phase next.",
    },
  });

  revalidateHr();
}
