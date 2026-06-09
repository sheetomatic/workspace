"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/app/login/password-actions";
import { passwordActionInitialState } from "@/app/login/password-action-state";

export function ForgotPasswordForm({ orgSlug = "" }: { orgSlug?: string }) {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    passwordActionInitialState,
  );

  const loginHref = orgSlug ? `/login?org=${encodeURIComponent(orgSlug)}` : "/login";

  if (state.ok) {
    return (
      <div className="login-card">
        <div className="login-card-head">
          <h2>Check your email</h2>
        </div>
        <p className="saas-form-message ok">{state.message}</p>
        <p className="login-switch-mode">
          <Link href={loginHref}>Back to sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="login-card">
      <div className="login-card-head">
        <h2>Forgot password</h2>
        <p>Enter your workspace email and we will send a reset link.</p>
      </div>
      <form action={action} className="login-form form-grid-premium">
        {orgSlug ? <input name="org" type="hidden" value={orgSlug} /> : null}
        <label className="form-field-full">
          Email
          <input
            autoComplete="email"
            name="email"
            placeholder="you@company.com"
            required
            type="email"
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
                <span>Sending...</span>
              </>
            ) : (
              <span>Send reset link</span>
            )}
          </button>
        </div>
      </form>
      <p className="login-switch-mode">
        <Link href={loginHref}>Back to sign in</Link>
      </p>
    </div>
  );
}
