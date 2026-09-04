"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  loginWithCredentialsFormAction,
  type LoginActionState,
} from "@/app/login/actions";
import { aiAppEntryHref } from "@/lib/ai-auth-links";
import { logoutHref } from "@/lib/auth-logout";
import { LEARN_ADMIN_HOME } from "@/lib/workspace-auth-links";

const showDemoAccounts = process.env.NODE_ENV === "development";

const demoAccounts = [
  { email: "owner@acme.demo", label: "Owner - Acme" },
  { email: "manager@acme.demo", label: "Manager - Acme" },
  { email: "owner@bakery.demo", label: "Owner - Bakery" },
  { email: "admin@hingorani.demo", label: "Admin - Hingorani", orgSlug: "hingorani" },
  { email: "manager@hingorani.demo", label: "Manager - Hingorani", orgSlug: "hingorani" },
];

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
  const isLearnProduct = product === "learn";
  const callbackUrl = safeCallbackUrl(
    searchParams.get("callbackUrl"),
    isAiProduct
      ? aiAppEntryHref(intent)
      : isLearnProduct
        ? LEARN_ADMIN_HOME
        : "/app/tasks",
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  const [orgOptions, setOrgOptions] = useState<LoginOrgOption[] | null>(null);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [orgLookupPending, setOrgLookupPending] = useState(false);
  const [orgLookupError, setOrgLookupError] = useState<string | null>(null);
  const orgLookupRequestId = useRef(0);
  const [loginState, loginAction, loginPending] = useActionState(
    loginWithCredentialsFormAction,
    loginInitialState,
  );

  const canSubmitLogin =
    !loginPending &&
    !orgLookupPending &&
    email.trim().length > 0 &&
    password.length > 0 &&
    (Boolean(orgLookupError) ||
      !orgOptions ||
      orgOptions.length <= 1 ||
      (selectedOrg.length > 0 && orgOptions.some((org) => org.slug === selectedOrg)));

  const lookupOrganizations = useCallback(
    async (lookupEmail: string, lookupPassword: string) => {
      if (isAiProduct || orgSlug) {
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
          setOrgOptions(null);
          setSelectedOrg("");
          setOrgLookupError("Could not load workspaces. You can still sign in.");
          return;
        }

        const data = (await response.json()) as { organizations?: LoginOrgOption[] };
        const organizations = Array.isArray(data.organizations)
          ? data.organizations
          : [];
        setOrgOptions(organizations);
        setOrgLookupError(null);

        if (organizations.length <= 1) {
          setSelectedOrg(organizations[0]?.slug ?? "");
          return;
        }

        const preferred =
          organizations.find((org) => org.isPrimary) ?? organizations[0];
        setSelectedOrg(preferred.slug);
      } catch {
        if (requestId === orgLookupRequestId.current) {
          setOrgOptions(null);
          setSelectedOrg("");
          setOrgLookupError("Network error while loading workspaces. You can still sign in.");
        }
      } finally {
        if (requestId === orgLookupRequestId.current) {
          setOrgLookupPending(false);
        }
      }
    },
    [isAiProduct, orgSlug],
  );

  useEffect(() => {
    if (isAiProduct || orgSlug) {
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
  }, [email, isAiProduct, lookupOrganizations, orgSlug, password]);

  useEffect(() => {
    if (loginState.message && !loginState.ok) {
      setError(loginState.message);
    }
  }, [loginState]);

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

  return (
    <div className="login-card">
      <div className="login-card-head">
        <h2>
          {isAiProduct
            ? "Log in to Sheetomatic AI"
            : isLearnProduct
              ? "Log in to Teach"
              : "Sign in to Workspace"}
        </h2>
        <p>
          {isAiProduct
            ? "Enter your email and password to continue."
            : isLearnProduct
              ? "Same workspace email and password. Only Students and Teach open here."
            : "Use the email and password shared after purchase, or sign in as the workspace owner."}
        </p>
      </div>

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
          {staleSessionError || workspaceError ? (
            <>
              {" · "}
              <a href={logoutHref("/login")}>Clear saved session</a>
            </>
          ) : null}
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

      {!isAiProduct ? (
        <p className="login-team-hint form-field-full">
          Need access? Purchase a plan, then your admin will share login email
          and password. Self-registration is closed.
        </p>
      ) : (
        <p className="login-team-hint form-field-full">
          Need an account? Contact Sheetomatic after purchase — self-registration
          is closed.
        </p>
      )}

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
                onClick={() =>
                  fillDemo(
                    account.email,
                    "orgSlug" in account ? account.orgSlug : undefined,
                  )
                }
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
