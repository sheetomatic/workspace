"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createUniqueOrganizationSlug } from "@/lib/org-slug";

export type RegisterActionState = {
  ok: boolean;
  message: string;
};

export async function registerSheetomaticAiAccount(
  _prev: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const name = formData.get("name")?.toString().trim() ?? "";
  const businessName = formData.get("businessName")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

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
          status: "ONBOARDING",
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
        },
      });
    });

    return { ok: true, message: "" };
  } catch (error) {
    console.error("[registerSheetomaticAiAccount]", error);
    return {
      ok: false,
      message: "Could not create your account. Please try again.",
    };
  }
}
