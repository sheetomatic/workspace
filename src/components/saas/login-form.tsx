"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  loginWithCredentialsAction,
  loginWithCredentialsFormAction,
  registerSheetomaticAiAccount,
  registerWorkspaceAccount,
  type LoginActionState,
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
  { email: "admin@hingorani.demo", label: "Admin - Hingorani", orgSlug: "hingorani" },
  { email: "manager@hingorani.demo", label: "Manager - Hingorani", orgSlug: "hingorani" },
];

const registerInitialState: RegisterActionState = {
  ok: false,
  message: "",
};

const loginInitialState: LoginActionState = {
  ok: false,
  message: "",
};

function safeCallbackUrl(raw: string | null, fallback: string) {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return fallback;
}

type LoginOrgOption = {
  slug: string;
  name: string;
  role: string;
  isPrimary?: boolean;
};

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
  const [orgOptions, setOrgOptions] = useState<LoginOrgOption[] | null>(null);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [orgLookupPending, setOrgLookupPending] = useState(false);
  const [orgLookupError, setOrgLookupError] = useState<string | null>(null);
  const orgLookupRequestId = useRef(0);
  const [loginState, loginAction, loginPending] = useActionState(
    loginWithCredentialsFormAction,
    loginInitialState,
  );
  const [registerState, registerAction, registerPending] = useActionState(
    isAiProduct ? registerSheetomaticAiAccount : registerWorkspaceAccount,
    registerInitialState,
  );

  const canSubmitLogin =
    !loginPending &&
    !registerPending &&
    !orgLookupPending &&
    email.trim().length > 0 &&
    password.length > 0 &&
    (!orgOptions ||
      orgOptions.length <= 1 ||
      (selectedOrg.length > 0 && orgOptions.some((org) => org.slug === selectedOrg)));

  const lookupOrganizations = useCallback(
    async (lookupEmail: string, lookupPassword: string) => {
      if (isSignup || isAiProduct || orgSlug) {
        setOrgOptions(null);
        setSelectedOrg("");
        return;
      }

      const normalizedEmail = lookupEmail.trim().toLowerCase();
      if (!normalizedEmail || lookupPassword.length === 0) {
        setOrgOptions(null);
        setSelectedOrg("");
        return;
      }

      const requestId = ++orgLookupRequestId.current;
      setOrgLookupPending(true);
      setOrgLookupError(null);

      try {
        const response = await fetch("/api/auth/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            password: lookupPassword,
          }),
        });

        if (requestId !== orgLookupRequestId.current) {
          return;
        }

        if (response.status === 401) {
          setOrgOptions(null);
          setSelectedOrg("");
          setOrgLookupError(null);
          return;
        }

        if (!response.ok) {
          setOrgLookupError("Could not load workspaces. Try again.");
          return;
        }

        const data = (await response.json()) as { organizations?: LoginOrgOption[] };
        const organizations = data.organizations ?? [];
        setOrgOptions(organizations);

        if (organizations.length === 1) {
          setSelectedOrg(organizations[0].slug);
          return;
        }

        if (organizations.length > 1) {
          const preferred =
            organizations.find((org) => org.isPrimary) ?? organizations[0];
          setSelectedOrg(preferred.slug);
        }
      } catch {
        if (requestId === orgLookupRequestId.current) {
          setOrgOptions(null);
          setSelectedOrg("");
          setOrgLookupError("Network error while loading workspaces.");
        }
      } finally {
        if (requestId === orgLookupRequestId.current) {
          setOrgLookupPending(false);
        }
      }
    },
    [isAiProduct, isSignup, orgSlug],
  );

  useEffect(() => {
    if (isSignup || isAiProduct || orgSlug) {
      setOrgOptions(null);
      setSelectedOrg("");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length === 0) {
      setOrgOptions(null);
      setSelectedOrg("");
      return;
    }

    const timer = window.setTimeout(() => {
      void lookupOrganizations(normalizedEmail, password);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [email, isAiProduct, isSignup, lookupOrganizations, orgSlug, password]);

  const canSubmitSignup =
    !loading &&
    !registerPending &&
    businessName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    confirmPassword.length >= 8;

  useEffect(() => {
    if (loginState.message && !loginState.ok) {
      setError(loginState.message);
    }
  }, [loginState]);

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

      const result = await loginWithCredentialsAction({
        email: email.trim().toLowerCase(),
        password,
        organization: orgSlug,
        callbackUrl,
      });

      if (cancelled) {
        return;
      }

      if (!result) {
        return;
      }

      setLoading(false);
      setError(
        result.message ||
          "Account created, but sign-in failed. Try logging in with your new password.",
      );
    }

    void finishSignup();

    return () => {
      cancelled = true;
    };
  }, [callbackUrl, email, orgSlug, password, registerPending, registerState]);

  function fillDemo(accountEmail: string, organization?: string) {
    setEmail(accountEmail);
    setPassword("demo1234");
    setError(null);
    if (organization) {
      setOrgOptions([
        {
          slug: organization,
          name: organization === "hingorani" ? "Hingorani Law Firm" : organization,
          role: "OWNER",
        },
      ]);
      setSelectedOrg(organization);
    } else {
      setOrgOptions(null);
      setSelectedOrg("");
    }
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
        <form action={loginAction} className="login-form form-grid-premium">
          <input name="callbackUrl" type="hidden" value={callbackUrl} />
          {orgSlug ? (
            <input name="organization" type="hidden" value={orgSlug} />
          ) : null}

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
                onBlur={() => void lookupOrganizations(email, password)}
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

          {orgOptions && orgOptions.length > 1 ? (
            <label className="form-field-full">
              Workspace
              <select
                aria-busy={orgLookupPending}
                name="organization"
                required
                value={selectedOrg}
                onChange={(event) => setSelectedOrg(event.target.value)}
              >
                {orgOptions.map((org) => (
                  <option key={org.slug} value={org.slug}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
          ) : orgOptions?.length === 1 ? (
            <input name="organization" type="hidden" value={orgOptions[0].slug} />
          ) : null}

          {orgLookupPending ? (
            <p className="login-org-hint form-field-full" role="status">
              <Loader2 className="animate-spin" size={16} aria-hidden />
              Looking up your workspaces…
            </p>
          ) : null}

          {orgLookupError ? (
            <p className="login-error form-field-full" role="alert">
              {orgLookupError}
            </p>
          ) : null}

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
              {loginPending ? (
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
                onClick={() => fillDemo(account.email, "orgSlug" in account ? account.orgSlug : undefined)}
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
