"use server";

import type { OrganizationStatus, WorkspaceModule } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createUniqueOrganizationSlug } from "@/lib/org-slug";

export type RegisterActionState = {
  ok: boolean;
  message: string;
};

type RegisterAccountInput = {
  name: string;
  businessName: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationStatus?: OrganizationStatus;
};

async function registerAccount(
  input: RegisterAccountInput,
): Promise<RegisterActionState> {
  const name = input.name.trim();
  const businessName = input.businessName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  if (!businessName) {
    return { ok: false, message: "Business name is required." };
  }

  if (!email || !email.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { ok: false, message: "Passwords do not match." };
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return {
      ok: false,
      message: "An account with this email already exists. Log in instead.",
    };
  }

  try {
    const slug = await createUniqueOrganizationSlug(businessName);
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: businessName,
          slug,
          status: input.organizationStatus ?? "ONBOARDING",
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          name: name || businessName,
          passwordHash,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "OWNER",
          modules: [
            "TASKS",
            "HR",
            "APPROVALS",
            "REPORTS",
          ] satisfies WorkspaceModule[],
        },
      });
    });

    return { ok: true, message: "" };
  } catch (error) {
    console.error("[registerAccount]", error);
    return {
      ok: false,
      message: "Could not create your account. Please try again.",
    };
  }
}

export async function registerSheetomaticAiAccount(
  _prev: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  return registerAccount({
    name: formData.get("name")?.toString() ?? "",
    businessName: formData.get("businessName")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
    organizationStatus: "ONBOARDING",
  });
}

export async function registerWorkspaceAccount(
  _prev: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  return registerAccount({
    name: formData.get("name")?.toString() ?? "",
    businessName: formData.get("businessName")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
    organizationStatus: "ACTIVE",
  });
}
