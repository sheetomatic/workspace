"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { completePasswordReset } from "@/app/login/password-actions";
import { passwordActionInitialState } from "@/app/login/password-action-state";

export function ResetPasswordForm({
  orgSlug = "",
  token = "",
}: {
  orgSlug?: string;
  token?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(
    completePasswordReset,
    passwordActionInitialState,
  );

  const loginHref = orgSlug ? `/login?org=${encodeURIComponent(orgSlug)}` : "/login";

  if (!token) {
    return (
      <div className="login-card">
        <p className="login-error">This reset link is invalid.</p>
        <p className="login-switch-mode">
          <Link href={`/login/forgot-password${orgSlug ? `?org=${encodeURIComponent(orgSlug)}` : ""}`}>
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  if (state.ok) {
    return (
      <div className="login-card">
        <div className="login-card-head">
          <h2>Password updated</h2>
        </div>
        <p className="saas-form-message ok">{state.message}</p>
        <p className="login-switch-mode">
          <Link href={loginHref}>Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="login-card">
      <div className="login-card-head">
        <h2>Set new password</h2>
        <p>Choose a new password for your account.</p>
      </div>
      <form action={action} className="login-form form-grid-premium">
        <input name="token" type="hidden" value={token} />
        <label className="form-field-full">
          New password
          <span className="login-password-wrap">
            <input
              autoComplete="new-password"
              minLength={8}
              name="password"
              placeholder="At least 8 characters"
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="login-password-toggle"
              type="button"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        <label className="form-field-full">
          Confirm password
          <input
            autoComplete="new-password"
            minLength={8}
            name="confirmPassword"
            placeholder="Repeat password"
            required
            type={showPassword ? "text" : "password"}
          />
        </label>
        {state.message ? (
          <p className="login-error form-field-full">{state.message}</p>
        ) : null}
        <div className="form-actions form-field-full">
          <button className="btn-cta btn-primary login-submit" disabled={pending} type="submit">
            {pending ? (
              <>
                <Loader2 aria-hidden className="animate-spin" size={18} />
                <span>Saving...</span>
              </>
            ) : (
              <span>Update password</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
