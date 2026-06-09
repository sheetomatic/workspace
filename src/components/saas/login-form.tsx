"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  registerSheetomaticAiAccount,
  registerWorkspaceAccount,
  type RegisterActionState,
} from "@/app/login/actions";
import { AI_LOGIN_HREF, AI_START_FREE_HREF, aiAppEntryHref } from "@/lib/ai-auth-links";
import {
  WORKSPACE_LOGIN_HREF,
  WORKSPACE_SIGNUP_HREF,
} from "@/lib/workspace-auth-links";

const showDemoAccounts = process.env.NODE_ENV === "development";

const demoAccounts = [
  { email: "owner@acme.demo", label: "Owner - Acme" },
  { email: "manager@acme.demo", label: "Manager - Acme" },
  { email: "owner@bakery.demo", label: "Owner - Bakery" },
];

const registerInitialState: RegisterActionState = {
  ok: false,
  message: "",
};

function safeCallbackUrl(raw: string | null, fallback: string) {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return fallback;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const product = searchParams.get("product");
  const intent = searchParams.get("intent");
  const orgSlug = searchParams.get("org")?.trim() || undefined;
  const isAiProduct = product === "ai";
  const isAiLogin = isAiProduct && intent === "login";
  const isAiSignup = isAiProduct && intent === "start";
  const isWorkspaceSignup = !isAiProduct && intent === "start" && !orgSlug;
  const isSignup = isAiSignup || isWorkspaceSignup;
  const callbackUrl = safeCallbackUrl(
    searchParams.get("callbackUrl"),
    isAiProduct
      ? isAiSignup
        ? "/ai/app/onboarding"
        : aiAppEntryHref(intent)
      : isWorkspaceSignup
        ? "/app/tasks"
        : "/app/tasks",
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const sessionError = searchParams.get("error");
  const workspaceError = sessionError === "workspace";
  const staleSessionError = sessionError === "session";
  const [error, setError] = useState<string | null>(
    workspaceError
      ? "Your workspace session is out of date. Sign in again."
      : staleSessionError
        ? "Your session expired. Sign in again."
        : null,
  );
  const [loading, setLoading] = useState(false);
  const [registerState, registerAction, registerPending] = useActionState(
    isAiProduct ? registerSheetomaticAiAccount : registerWorkspaceAccount,
    registerInitialState,
  );

  const canSubmitLogin =
    !loading && !registerPending && email.trim().length > 0 && password.length > 0;

  const canSubmitSignup =
    !loading &&
    !registerPending &&
    businessName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    confirmPassword.length >= 8;

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    const result = await signIn("credentials", {
      email: normalizedEmail,
      password,
      organization: orgSlug,
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (!result?.ok || result?.error) {
      setError("Email or password did not match. Try again.");
      return;
    }

    window.location.assign(callbackUrl);
  }

  useEffect(() => {
    if (!registerState.ok || registerPending) {
      if (registerState.message && !registerState.ok) {
        setError(registerState.message);
      }
      return;
    }

    let cancelled = false;

    async function finishSignup() {
      setLoading(true);
      setError(null);

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        organization: orgSlug,
        callbackUrl,
        redirect: false,
      });

      if (cancelled) {
        return;
      }

      setLoading(false);

      if (!result?.ok || result?.error) {
        setError(
          "Account created, but sign-in failed. Try logging in with your new password.",
        );
        return;
      }

      window.location.assign(callbackUrl);
    }

    void finishSignup();

    return () => {
      cancelled = true;
    };
  }, [callbackUrl, email, orgSlug, password, registerPending, registerState]);

  function fillDemo(accountEmail: string) {
    setEmail(accountEmail);
    setPassword("demo1234");
    setError(null);
  }

  const signupTitle = isAiProduct
    ? "Start free with Sheetomatic AI"
    : "Create your workspace";

  const signupLead = isAiProduct
    ? "Create your workspace with email and password. No credit card required."
    : "Create your company workspace with email and password. Add team logins from Team after sign-up.";

  return (
    <div className="login-card">
      <div className="login-card-head">
        <h2>
          {isSignup
            ? signupTitle
            : isAiProduct
              ? "Log in to Sheetomatic AI"
              : "Sign in to Workspace"}
        </h2>
        <p>
          {isSignup
            ? signupLead
            : isAiProduct
              ? "Enter your email and password to continue."
              : "Use the email and password your admin shared, or sign in as the workspace owner."}
        </p>
      </div>

      {isSignup ? (
        <form action={registerAction} className="login-form form-grid-premium">
          <label>
            Business name
            <input
              autoComplete="organization"
              name="businessName"
              placeholder="Acme Retail"
              required
              type="text"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
            />
          </label>

          <label>
            Your name
            <input
              autoComplete="name"
              name="name"
              placeholder="Optional"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              placeholder="you@company.com"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Password
            <span className="login-password-wrap">
              <input
                autoComplete="new-password"
                minLength={8}
                name="password"
                placeholder="At least 8 characters"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
            Confirm password
            <input
              autoComplete="new-password"
              minLength={8}
              name="confirmPassword"
              placeholder="Repeat password"
              required
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>

          {error ? <p className="login-error form-field-full">{error}</p> : null}

          <div className="form-actions form-field-full">
            <button
              className="btn-cta btn-primary login-submit"
              disabled={!canSubmitSignup}
              type="submit"
            >
              {registerPending || loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} aria-hidden />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>{isAiProduct ? "Create free account" : "Create workspace"}</span>
              )}
            </button>
          </div>
        </form>
      ) : (
        <form className="login-form form-grid-premium" onSubmit={handleLoginSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              placeholder="you@company.com"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Password
            <span className="login-password-wrap">
              <input
                autoComplete="current-password"
                name="password"
                placeholder="Password"
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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

          <p className="login-forgot-link form-field-full">
            <Link
              href={
                orgSlug
                  ? `/login/forgot-password?org=${encodeURIComponent(orgSlug)}`
                  : "/login/forgot-password"
              }
            >
              Forgot password?
            </Link>
          </p>

          {error ? <p className="login-error form-field-full">{error}</p> : null}

          <div className="form-actions form-field-full">
            <button
              className="btn-cta btn-primary login-submit"
              disabled={!canSubmitLogin}
              type="submit"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} aria-hidden />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </div>
        </form>
      )}

      {isAiProduct ? (
        <p className="login-switch-mode form-field-full">
          {isAiLogin ? (
            <>
              New to Sheetomatic AI?{" "}
              <Link href={AI_START_FREE_HREF}>Start free</Link>
            </>
          ) : (
            <>
              Already a member?{" "}
              <Link href={AI_LOGIN_HREF}>Log in</Link>
            </>
          )}
        </p>
      ) : (
        <p className="login-switch-mode form-field-full">
          {isWorkspaceSignup ? (
            <>
              Already have access?{" "}
              <Link href={WORKSPACE_LOGIN_HREF}>Sign in</Link>
            </>
          ) : (
            <>
              New company workspace?{" "}
              <Link href={WORKSPACE_SIGNUP_HREF}>Sign up</Link>
            </>
          )}
        </p>
      )}

      {!isSignup && !isAiProduct ? (
        <p className="login-team-hint form-field-full">
          Team member? Ask your admin for login email and password, then sign in
          here.
        </p>
      ) : null}

      {showDemoAccounts ? (
        <details className="login-demo">
          <summary>Local demo accounts</summary>
          <p className="login-demo-hint">Password: demo1234</p>
          <div className="login-demo-grid">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                className="login-demo-btn"
                type="button"
                onClick={() => fillDemo(account.email)}
              >
                {account.label}
              </button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
