"use server";

import {
  buildPasswordResetUrl,
  consumePasswordResetToken,
  createPasswordResetToken,
  updateUserPassword,
  validateNewPassword,
} from "@/lib/password-reset";
import {
  isEmailConfigured,
  sendPasswordResetLinkEmail,
} from "@/lib/integrations/email";
import type { PasswordActionState } from "@/app/login/password-action-state";

export type { PasswordActionState } from "@/app/login/password-action-state";

const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, we sent a password reset link. Check your inbox.";

export async function requestPasswordReset(
  _prev: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  try {
    const email = formData.get("email")?.toString() ?? "";
    const orgSlug = formData.get("org")?.toString().trim() || null;

    if (!email.includes("@")) {
      return { ok: false, message: "Enter a valid email address." };
    }

    const created = await createPasswordResetToken(email);

    if (created && isEmailConfigured()) {
      const resetUrl = buildPasswordResetUrl(created.token, orgSlug);
      await sendPasswordResetLinkEmail({
        toEmail: created.email,
        resetUrl,
      });
    }

    return { ok: true, message: GENERIC_RESET_MESSAGE };
  } catch (error) {
    console.error("[requestPasswordReset]", error);
    return {
      ok: false,
      message: "Could not send reset link right now. Please try again in a moment.",
    };
  }
}

export async function completePasswordReset(
  _prev: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  try {
    const token = formData.get("token")?.toString().trim() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

    if (!token) {
      return { ok: false, message: "Reset link is invalid or expired." };
    }

    const passwordError = validateNewPassword(password, confirmPassword);
    if (passwordError) {
      return { ok: false, message: passwordError };
    }

    const user = await consumePasswordResetToken(token);
    if (!user) {
      return { ok: false, message: "Reset link is invalid or expired." };
    }

    await updateUserPassword(user.id, password);

    return {
      ok: true,
      message: "Password updated. You can sign in with your new password.",
    };
  } catch (error) {
    console.error("[completePasswordReset]", error);
    return {
      ok: false,
      message: "Could not update your password. Please try again.",
    };
  }
}
