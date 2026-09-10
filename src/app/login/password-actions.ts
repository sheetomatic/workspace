"use server";

import { headers } from "next/headers";
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
import { checkRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";
import type { PasswordActionState } from "@/app/login/password-action-state";

export type { PasswordActionState } from "@/app/login/password-action-state";

const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, we sent a password reset link. Check your inbox.";
const RATE_LIMIT_MESSAGE =
  "Too many attempts. Please wait a few minutes and try again.";

export async function requestPasswordReset(
  _prev: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  try {
    const email = formData.get("email")?.toString() ?? "";
    const orgSlug = formData.get("org")?.toString().trim() || null;
    const headerStore = await headers();
    const ipKey = rateLimitKeyFromHeaders("password-reset", headerStore);
    const emailKey = `password-reset-email:${email.trim().toLowerCase()}`;

    const [ipRate, emailRate] = await Promise.all([
      checkRateLimit(ipKey, 10, 15 * 60_000),
      checkRateLimit(emailKey, 5, 15 * 60_000),
    ]);
    if (!ipRate.allowed || !emailRate.allowed) {
      return { ok: false, message: RATE_LIMIT_MESSAGE };
    }

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
    const headerStore = await headers();
    const completeRate = await checkRateLimit(
      rateLimitKeyFromHeaders("password-reset-complete", headerStore),
      10,
      15 * 60_000,
    );
    if (!completeRate.allowed) {
      return { ok: false, message: RATE_LIMIT_MESSAGE };
    }

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
