"use server";

import type { OrganizationStatus, WorkspaceModule } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { resolveOrganizationsForCredentials } from "@/lib/auth-orgs";
import { prisma } from "@/lib/db";
import { createUniqueOrganizationSlug } from "@/lib/org-slug";

export type RegisterActionState = {
  ok: boolean;
  message: string;
};

export type LoginActionState = {
  ok: boolean;
  message: string;
};

export async function loginWithCredentialsAction(input: {
  email: string;
  password: string;
  organization?: string;
  callbackUrl: string;
}): Promise<LoginActionState | void> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const organization = input.organization?.trim() || undefined;
  const callbackUrl = input.callbackUrl;

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  if (organization) {
    const organizations = await resolveOrganizationsForCredentials(email, password);
    if (!organizations) {
      return { ok: false, message: "Email or password did not match. Try again." };
    }

    if (!organizations.some((item) => item.slug === organization)) {
      return {
        ok: false,
        message:
          "This account does not have access to this workspace. Check the link from your admin or sign in at the main portal.",
      };
    }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      ...(organization ? { organization } : {}),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { ok: false, message: "Email or password did not match. Try again." };
      }
      return { ok: false, message: "Sign-in failed. Please try again." };
    }

    throw error;
  }
}

export async function loginWithCredentialsFormAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const result = await loginWithCredentialsAction({
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    organization: formData.get("organization")?.toString(),
    callbackUrl: formData.get("callbackUrl")?.toString() ?? "/app/tasks",
  });

  if (!result) {
    return { ok: true, message: "" };
  }

  return result;
}

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
    // New workspaces stay in ONBOARDING until a super admin activates them.
    organizationStatus: "ONBOARDING",
  });
}
