"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { changeOwnPassword } from "@/app/app/settings/password-actions";
import { passwordActionInitialState, type PasswordActionState } from "@/app/login/password-action-state";

export function ChangePasswordPanel() {
  const [state, action, pending] = useActionState<
    PasswordActionState,
    FormData
  >(changeOwnPassword, passwordActionInitialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <article className="saas-panel ws-password-settings">
      <h3>Password</h3>
      <p className="saas-panel-lead">
        Change your sign-in password for this workspace account.
      </p>
      <form action={action} className="ws-hr-form">
        <label>
          Current password
          <span className="login-password-wrap">
            <input
              autoComplete="current-password"
              name="currentPassword"
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
        <label>
          New password
          <input
            autoComplete="new-password"
            minLength={8}
            name="newPassword"
            required
            type={showPassword ? "text" : "password"}
          />
        </label>
        <label>
          Confirm new password
          <input
            autoComplete="new-password"
            minLength={8}
            name="confirmPassword"
            required
            type={showPassword ? "text" : "password"}
          />
        </label>
        <div className="form-actions">
          <button className="btn-cta btn-primary" disabled={pending} type="submit">
            {pending ? "Updating..." : "Update password"}
          </button>
        </div>
        {state.message ? (
          <p className={state.ok ? "saas-form-message ok" : "saas-form-message error"}>
            {state.message}
          </p>
        ) : null}
      </form>
    </article>
  );
}
