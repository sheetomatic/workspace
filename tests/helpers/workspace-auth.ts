import { expect, type APIRequestContext, type Page } from "playwright/test";
import { DEMO_PASSWORD } from "./demo";

export function passwordField(page: Page) {
  return page.locator('input[name="password"]');
}

export type WorkspaceLoginOptions = {
  email: string;
  password?: string;
  organizationSlug?: string;
  callbackUrl?: string;
};

/** Programmatic NextAuth credentials sign-in (stable for E2E). */
export async function signInWithCredentials(
  request: APIRequestContext,
  options: WorkspaceLoginOptions,
) {
  const password = options.password ?? DEMO_PASSWORD;
  const callbackUrl = options.callbackUrl ?? "/app/tasks";

  const csrfResponse = await request.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBeTruthy();
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const response = await request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email: options.email,
      password,
      organization: options.organizationSlug ?? "",
      callbackUrl,
      json: "true",
    },
    maxRedirects: 0,
  });

  expect([200, 302, 303]).toContain(response.status());
}

/** Sign in and open the workspace (API auth + navigation). */
export async function loginToWorkspace(
  page: Page,
  options: WorkspaceLoginOptions,
) {
  await signInWithCredentials(page.request, options);
  await page.goto(options.callbackUrl ?? "/app/tasks");
  await page.waitForURL(/\/app/, { timeout: 20_000 });
}

/** Exercise the visible login form (org picker, validation messages). */
export async function loginViaWorkspaceForm(
  page: Page,
  options: WorkspaceLoginOptions & { loginPath?: string },
) {
  const password = options.password ?? DEMO_PASSWORD;
  const loginPath = options.loginPath ?? "/login";

  await page.goto(loginPath);
  await page.getByLabel("Email").fill(options.email);
  await passwordField(page).fill(password);

  if (!options.organizationSlug) {
    await page.waitForTimeout(700);
    await page
      .getByText("Looking up your workspaces")
      .waitFor({ state: "hidden", timeout: 15_000 })
      .catch(() => {});
  }

  const workspaceSelect = page.getByLabel("Workspace");
  if (await workspaceSelect.isVisible().catch(() => false)) {
    if (options.organizationSlug) {
      await workspaceSelect.selectOption(options.organizationSlug);
    }
  }

  const signInButton = page.getByRole("button", { name: /sign in/i });
  await expect(signInButton).toBeEnabled({ timeout: 15_000 });
  await signInButton.click();
  await page.waitForURL(/\/(app|login)/, { timeout: 20_000 });
}

/** Returns true when demo seed users respond to the org lookup API. */
export async function isDemoDatabaseSeeded(request: APIRequestContext) {
  const response = await request.post("/api/auth/organizations", {
    data: {
      email: "owner@acme.demo",
      password: DEMO_PASSWORD,
    },
  });

  if (!response.ok()) {
    return false;
  }

  const body = (await response.json()) as { organizations?: unknown[] };
  return Array.isArray(body.organizations) && body.organizations.length > 0;
}

/** Reuse authenticated cookies from a page login in API requests. */
export async function apiContextWithPageCookies(
  page: Page,
  baseURL: string,
): Promise<APIRequestContext> {
  const { request } = await import("playwright/test");
  const cookies = await page.context().cookies();
  return request.newContext({
    baseURL,
    storageState: {
      cookies: cookies.map((cookie) => ({
        ...cookie,
        expires: cookie.expires ?? -1,
      })),
      origins: [],
    },
  });
}

export async function expectLoggedIntoWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app/);
}

export type SessionUserProfile = {
  id: string;
  email: string;
  organizationId: string;
  organizationSlug: string;
};

/** Read the authenticated user from NextAuth session cookies on a request context. */
export async function fetchSessionUser(
  request: APIRequestContext,
): Promise<SessionUserProfile | null> {
  const response = await request.get("/api/auth/session");
  if (!response.ok()) {
    return null;
  }

  const body = (await response.json()) as {
    user?: SessionUserProfile | null;
  };
  return body.user ?? null;
}

/** Sign in via API and return the session user profile. */
export async function signInAndFetchSessionUser(
  request: APIRequestContext,
  options: WorkspaceLoginOptions,
) {
  await signInWithCredentials(request, options);
  return fetchSessionUser(request);
}
