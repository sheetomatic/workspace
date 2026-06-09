"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  updateUserPassword,
  validateNewPassword,
} from "@/lib/password-reset";
import type { PasswordActionState } from "@/app/login/password-action-state";

export async function changeOwnPassword(
  _prev: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "You must be signed in." };
  }

  const currentPassword = formData.get("currentPassword")?.toString() ?? "";
  const newPassword = formData.get("newPassword")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!currentPassword) {
    return { ok: false, message: "Enter your current password." };
  }

  const passwordError = validateNewPassword(newPassword, confirmPassword);
  if (passwordError) {
    return { ok: false, message: passwordError };
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!record?.passwordHash) {
    return {
      ok: false,
      message: "This account uses external sign-in. Contact your admin.",
    };
  }

  const valid = await bcrypt.compare(currentPassword, record.passwordHash);
  if (!valid) {
    return { ok: false, message: "Current password is incorrect." };
  }

  if (currentPassword === newPassword) {
    return {
      ok: false,
      message: "New password must be different from your current password.",
    };
  }

  await updateUserPassword(user.id, newPassword);
  revalidatePath("/app/settings");

  return { ok: true, message: "Password updated successfully." };
}
