"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import type { AttendanceWorkMode, Role, TaskDepartment } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/auth";
import { normalizeStaffCode } from "@/lib/legal-cases/access";
import { prisma } from "@/lib/db";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import { hasMinimumRole, ROLE_LABELS } from "@/lib/permissions";
import {
  emailStatusMessage,
  sendTeamPasswordResetEmail,
  sendTeamWelcomeEmail,
  sendTeamWorkspaceAccessEmail,
} from "@/lib/integrations/email";
import { assertOrganizationAccess } from "@/lib/workspace";
import {
  modulesFromRoleDefault,
  parseModulesFromForm,
  resolveMemberModules,
} from "@/lib/workspace-modules";

export type TeamActionState = {
  ok: boolean;
  message: string;
  loginEmail?: string;
  tempPassword?: string;
  emailSent?: boolean;
  userId?: string;
  userName?: string;
};

const ASSIGNABLE_ROLES: Role[] = ["VIEWER", "STAFF", "MANAGER", "ADMIN"];
const DEPARTMENTS: TaskDepartment[] = [
  "OPERATIONS",
  "SALES",
  "ACCOUNTS",
  "ADMIN",
  "GENERAL",
];

const WORK_MODES: AttendanceWorkMode[] = ["OFFICE", "FIELD", "HYBRID"];

function parseWorkMode(raw: string | null | undefined): AttendanceWorkMode {
  const value = raw?.trim().toUpperCase() ?? "OFFICE";
  return WORK_MODES.includes(value as AttendanceWorkMode)
    ? (value as AttendanceWorkMode)
    : "OFFICE";
}

function parseDepartment(raw: string | null | undefined): TaskDepartment | null {
  const value = raw?.trim().toUpperCase() ?? "";
  return DEPARTMENTS.includes(value as TaskDepartment)
    ? (value as TaskDepartment)
    : null;
}

function parseReportingManagerId(raw: string | null | undefined) {
  const value = raw?.toString().trim() ?? "";
  return value || null;
}

async function validateReportingManager(input: {
  organizationId: string;
  role: Role;
  reportingManagerId: string | null;
  membershipId?: string;
}) {
  if (input.role === "OWNER") {
    return null;
  }

  if (!input.reportingManagerId) {
    return "Reporting manager is required.";
  }

  if (input.membershipId && input.reportingManagerId === input.membershipId) {
    return "A member cannot report to themselves.";
  }

  const manager = await prisma.membership.findFirst({
    where: {
      id: input.reportingManagerId,
      organizationId: input.organizationId,
    },
    select: { id: true, reportingManagerId: true },
  });

  if (!manager) {
    return "Reporting manager must be a member of this workspace.";
  }

  if (input.membershipId) {
    let current: string | null = manager.reportingManagerId;
    const visited = new Set<string>([manager.id]);

    while (current) {
      if (current === input.membershipId) {
        return "Reporting manager assignment would create a circular hierarchy.";
      }
      if (visited.has(current)) {
        break;
      }
      visited.add(current);

      const next = await prisma.membership.findUnique({
        where: { id: current },
        select: { reportingManagerId: true },
      });
      current = next?.reportingManagerId ?? null;
    }
  }

  return null;
}

export async function inviteTeamMember(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can invite members." };
  }

  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const role = (formData.get("role")?.toString() ?? "STAFF") as Role;
  const name = formData.get("name")?.toString().trim() ?? "";
  const designation = formData.get("designation")?.toString().trim() ?? "";
  const department = parseDepartment(formData.get("department")?.toString());
  const whatsappRaw = formData.get("whatsapp")?.toString() ?? "";
  const phone = normalizeWhatsAppPhone(whatsappRaw);
  const initialPasswordRaw = formData.get("initialPassword")?.toString() ?? "";
  const initialPassword = initialPasswordRaw.trim();
  const reportingManagerId = parseReportingManagerId(
    formData.get("reportingManagerId")?.toString(),
  );
  let resolvedReportingManagerId = reportingManagerId;
  if (!resolvedReportingManagerId && role !== "OWNER") {
    const inviterMembership = await prisma.membership.findFirst({
      where: { organizationId: user.organizationId, userId: user.id },
      select: { id: true },
    });
    resolvedReportingManagerId = inviterMembership?.id ?? null;
  }
  const isDepartmentHead = formData.get("isDepartmentHead") === "on";
  const staffCode =
    normalizeStaffCode(formData.get("staffCode")?.toString()) || null;

  if (!email.includes("@")) {
    return { ok: false, message: "Enter a valid email." };
  }

  if (!name) {
    return { ok: false, message: "Enter the member name." };
  }

  if (!department) {
    return { ok: false, message: "Select a department." };
  }

  if (!designation) {
    return { ok: false, message: "Enter a designation." };
  }

  if (whatsappRaw.trim() && !phone) {
    return {
      ok: false,
      message: "WhatsApp number must be at least 10 digits (e.g. 9685788980).",
    };
  }

  if (initialPassword && initialPassword.length < 8) {
    return {
      ok: false,
      message: "Initial password must be at least 8 characters, or leave blank to auto-generate.",
    };
  }

  if (!ASSIGNABLE_ROLES.includes(role) && role !== "OWNER") {
    return { ok: false, message: "Invalid role." };
  }

  if (role === "OWNER" && user.role !== "OWNER") {
    return { ok: false, message: "Only owners can assign the Owner role." };
  }

  const reportingManagerError = await validateReportingManager({
    organizationId: user.organizationId,
    role,
    reportingManagerId: resolvedReportingManagerId,
  });
  if (reportingManagerError) {
    return { ok: false, message: reportingManagerError };
  }

  let modules = parseModulesFromForm(formData);
  if (modules.length === 0) {
    modules = modulesFromRoleDefault(role);
  }

  await assertOrganizationAccess(user.organizationId, user.id);

  const existingMembership = await prisma.membership.findFirst({
    where: {
      organizationId: user.organizationId,
      user: { email },
    },
  });

  if (existingMembership) {
    return { ok: false, message: "This person is already in the workspace." };
  }

  let memberUser = await prisma.user.findUnique({ where: { email } });

  if (memberUser) {
    if (phone) {
      await prisma.user.update({
        where: { id: memberUser.id },
        data: { phone, name },
      });
    } else if (name) {
      await prisma.user.update({
        where: { id: memberUser.id },
        data: { name },
      });
    }

    await prisma.membership.create({
      data: {
        userId: memberUser.id,
        organizationId: user.organizationId,
        role,
        department,
        designation,
        reportingManagerId: resolvedReportingManagerId,
        isDepartmentHead,
        modules,
        staffCode,
      },
    });

    const emailResult = await sendTeamWorkspaceAccessEmail({
      toEmail: email,
      memberName: name,
      organizationName: user.organizationName,
      roleLabel: ROLE_LABELS[role],
      invitedByName: user.name ?? user.email,
    });

    revalidatePath("/app/team");
    revalidatePath("/app/fms/setup");
    revalidatePath("/app/fms/design/new");
    return {
      ok: true,
      message: emailStatusMessage(
        email,
        emailResult,
        `${name} added to ${user.organizationName}. They sign in with their existing Sheetomatic password.`,
      ),
      loginEmail: email,
      emailSent: emailResult.sent,
      userId: memberUser.id,
      userName: name,
    };
  }

  const tempPassword = initialPassword || randomBytes(12).toString("base64url");
  memberUser = await prisma.user.create({
    data: {
      email,
      name,
      phone,
      passwordHash: await bcrypt.hash(tempPassword, 10),
      memberships: {
        create: {
          organizationId: user.organizationId,
          role,
          department,
          designation,
          reportingManagerId: resolvedReportingManagerId,
          isDepartmentHead,
          modules,
          staffCode,
        },
      },
    },
  });

  await prisma.invitation.create({
    data: {
      email,
      role,
      organizationId: user.organizationId,
      invitedById: user.id,
      token: randomBytes(24).toString("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      acceptedAt: new Date(),
    },
  });

  const emailResult = await sendTeamWelcomeEmail({
    toEmail: email,
    memberName: name,
    organizationName: user.organizationName,
    roleLabel: ROLE_LABELS[role],
    tempPassword,
    invitedByName: user.name ?? user.email,
  });

  revalidatePath("/app/team");
  revalidatePath("/app/fms/setup");
  revalidatePath("/app/fms/design/new");
  return {
    ok: true,
    message: emailStatusMessage(
      email,
      emailResult,
      `${name} added to ${user.organizationName}.`,
    ),
    loginEmail: email,
    tempPassword: emailResult.sent ? undefined : tempPassword,
    emailSent: emailResult.sent,
    userId: memberUser.id,
    userName: name,
  };
}

export async function updateTeamMemberDetails(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can update members." };
  }

  const membershipId = formData.get("membershipId")?.toString() ?? "";
  const role = (formData.get("role")?.toString() ?? "") as Role;
  const name = formData.get("name")?.toString().trim() ?? "";
  const designation = formData.get("designation")?.toString().trim() ?? "";
  const department = parseDepartment(formData.get("department")?.toString());
  const attendanceWorkMode = parseWorkMode(
    formData.get("attendanceWorkMode")?.toString(),
  );
  const geoFenceRequired = formData.get("geoFenceRequired") === "on";
  const faceRequired = formData.get("faceRequired") === "on";
  const whatsappRaw = formData.get("whatsapp")?.toString() ?? "";
  const phone = normalizeWhatsAppPhone(whatsappRaw);
  const reportingManagerId = parseReportingManagerId(
    formData.get("reportingManagerId")?.toString(),
  );
  const isDepartmentHead = formData.get("isDepartmentHead") === "on";

  if (!membershipId) {
    return { ok: false, message: "Member not found." };
  }

  if (!name || !designation || !department) {
    return { ok: false, message: "Name, department, and designation are required." };
  }

  if (whatsappRaw.trim() && !phone) {
    return { ok: false, message: "Invalid WhatsApp number." };
  }

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: user.organizationId },
    include: { user: true },
  });

  if (!membership) {
    return { ok: false, message: "Member not found." };
  }

  if (membership.userId === user.id) {
    return { ok: false, message: "Use Settings to update your own profile." };
  }

  if (role === "OWNER" && user.role !== "OWNER") {
    return { ok: false, message: "Only owners can assign the Owner role." };
  }

  const reportingManagerError = await validateReportingManager({
    organizationId: user.organizationId,
    role,
    reportingManagerId,
    membershipId,
  });
  if (reportingManagerError) {
    return { ok: false, message: reportingManagerError };
  }

  let modules = parseModulesFromForm(formData);
  if (modules.length === 0) {
    modules = resolveMemberModules(role, membership.modules);
  }

  await prisma.user.update({
    where: { id: membership.userId },
    data: {
      name,
      phone: phone ?? membership.user.phone,
    },
  });

  await prisma.membership.update({
    where: { id: membershipId },
    data: {
      role,
      department,
      designation,
      reportingManagerId: role === "OWNER" ? null : reportingManagerId,
      isDepartmentHead,
      attendanceWorkMode,
      geoFenceRequired,
      faceRequired,
      modules,
    },
  });

  revalidatePath("/app/team");
  revalidatePath("/app/hr/attendance");
  return { ok: true, message: "Member details updated." };
}

export async function updateMemberRole(
  membershipId: string,
  role: Role,
): Promise<TeamActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can change roles." };
  }

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: user.organizationId },
    include: { user: true },
  });

  if (!membership) {
    return { ok: false, message: "Member not found." };
  }

  if (membership.userId === user.id) {
    return { ok: false, message: "You cannot change your own role here." };
  }

  if (membership.role === "OWNER" && user.role !== "OWNER") {
    return { ok: false, message: "Only owners can change another owner." };
  }

  if (role === "OWNER" && user.role !== "OWNER") {
    return { ok: false, message: "Only owners can promote to Owner." };
  }

  await prisma.membership.update({
    where: { id: membershipId },
    data: { role },
  });

  revalidatePath("/app/team");
  return { ok: true, message: "Role updated." };
}

export async function removeTeamMember(
  membershipId: string,
): Promise<TeamActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can remove members." };
  }

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: user.organizationId },
  });

  if (!membership) {
    return { ok: false, message: "Member not found." };
  }

  if (membership.userId === user.id) {
    return { ok: false, message: "You cannot remove yourself." };
  }

  if (membership.role === "OWNER") {
    const ownerCount = await prisma.membership.count({
      where: { organizationId: user.organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return { ok: false, message: "Cannot remove the only owner." };
    }
  }

  await prisma.membership.delete({ where: { id: membershipId } });
  revalidatePath("/app/team");
  return { ok: true, message: "Member removed from workspace." };
}

export async function resetTeamMemberPassword(
  membershipId: string,
): Promise<TeamActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can reset passwords." };
  }

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: user.organizationId },
    include: { user: true },
  });

  if (!membership) {
    return { ok: false, message: "Member not found." };
  }

  if (membership.userId === user.id) {
    return {
      ok: false,
      message: "Use Settings to change your own password.",
    };
  }

  const tempPassword = randomBytes(12).toString("base64url");

  await prisma.user.update({
    where: { id: membership.userId },
    data: {
      passwordHash: await bcrypt.hash(tempPassword, 10),
    },
  });

  const emailResult = await sendTeamPasswordResetEmail({
    toEmail: membership.user.email,
    memberName: membership.user.name ?? membership.user.email,
    organizationName: user.organizationName,
    tempPassword,
  });

  revalidatePath("/app/team");
  return {
    ok: true,
    message: emailStatusMessage(
      membership.user.email,
      emailResult,
      `New temporary password created for ${membership.user.name ?? membership.user.email}.`,
    ),
    loginEmail: membership.user.email,
    tempPassword: emailResult.sent ? undefined : tempPassword,
    emailSent: emailResult.sent,
  };
}
