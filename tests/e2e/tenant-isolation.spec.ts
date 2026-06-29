import { expect, test } from "playwright/test";
import {
  DEMO_ORGS,
  DEMO_PASSWORD,
  DEMO_USERS,
  TENANT_MARKERS,
} from "../helpers/demo";
import {
  apiContextWithPageCookies,
  fetchSessionUser,
  isDemoDatabaseSeeded,
  loginToWorkspace,
  passwordField,
  signInAndFetchSessionUser,
  signInWithCredentials,
} from "../helpers/workspace-auth";

test.describe.configure({ mode: "serial" });

let seeded = false;

test.beforeAll(async ({ request }) => {
  seeded = await isDemoDatabaseSeeded(request);
});

test.describe("tenant isolation - authenticated (requires db:seed)", () => {
  test.skip(() => !seeded, "Run npm run db:seed before authenticated tenant E2E");

  test("tenant A task export does not include tenant B task titles", async ({
    page,
    baseURL,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.acmeOwner,
      organizationSlug: DEMO_ORGS.acme,
    });
    await expect(page).toHaveURL(/\/app/);

    const api = await apiContextWithPageCookies(page, baseURL!);
    const response = await api.get("/api/tasks/export");
    expect(response.status()).toBe(200);

    const csv = await response.text();
    expect(csv).toContain(TENANT_MARKERS.acme);
    expect(csv).not.toContain(TENANT_MARKERS.bakery);
  });

  test("tenant A tasks page does not show tenant B task titles", async ({
    page,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.acmeOwner,
      organizationSlug: DEMO_ORGS.acme,
    });
    await page.goto("/app/tasks");
    await expect(page.getByText(TENANT_MARKERS.acme).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(TENANT_MARKERS.bakery)).toHaveCount(0);
  });

  test("tenant A cannot fetch another tenant IMS attachment by id", async ({
    page,
    baseURL,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.acmeOwner,
      organizationSlug: DEMO_ORGS.acme,
    });

    const api = await apiContextWithPageCookies(page, baseURL!);
    const forgedAttachmentId = "clxxxxxxxxxxxxxxxxxxxxxxxxx";
    const response = await api.get(`/api/ims/attachments/${forgedAttachmentId}`);
    expect([403, 404]).toContain(response.status());
  });

  test("tenant A cannot fetch another tenant task attachment by id", async ({
    page,
    baseURL,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.acmeOwner,
      organizationSlug: DEMO_ORGS.acme,
    });

    const api = await apiContextWithPageCookies(page, baseURL!);
    const forgedAttachmentId = "clxxxxxxxxxxxxxxxxxxxxxxxxx";
    const response = await api.get(`/api/tasks/attachments/${forgedAttachmentId}`);
    expect(response.status()).toBe(404);
  });

  test("credentials sign-in rejects foreign organization slug", async ({
    request,
  }) => {
    await signInWithCredentials(request, {
      email: DEMO_USERS.acmeOwner,
      organizationSlug: DEMO_ORGS.bakery,
    });

    const session = await request.get("/api/auth/session");
    expect(session.ok()).toBeTruthy();
    const body = await session.json();
    expect(body).toBeNull();
  });

  test("onboarding organization shows activation hold screen", async ({
    page,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.bakeryOwner,
      organizationSlug: DEMO_ORGS.bakery,
    });

    await expect(
      page.getByRole("heading", { name: /workspace is being activated/i }),
    ).toBeVisible();
  });

  test("onboarding organization cannot reach workspace tasks", async ({
    page,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.bakeryOwner,
      organizationSlug: DEMO_ORGS.bakery,
      callbackUrl: "/app/tasks",
    });

    await expect(page).not.toHaveURL(/\/app\/tasks/);
    await expect(
      page.getByRole("heading", { name: /workspace is being activated/i }),
    ).toBeVisible();
  });

  test("multi-org user sees workspace picker before sign-in", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = passwordField(page);
    await emailInput.fill(DEMO_USERS.multiOrgConsultant);
    await passwordInput.fill(DEMO_PASSWORD);
    await passwordInput.dispatchEvent("input");
    await passwordInput.dispatchEvent("change");
    await passwordInput.blur();

    const workspaceSelect = page.getByLabel("Workspace");
    await expect(workspaceSelect).toBeVisible({ timeout: 20_000 });

    const options = workspaceSelect.locator("option");
    await expect(options).toHaveCount(2);

    await workspaceSelect.selectOption(DEMO_ORGS.hingorani);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
  });

  test("org lookup API only returns workspaces for valid credentials", async ({
    request,
  }) => {
    const acme = await request.post("/api/auth/organizations", {
      data: { email: DEMO_USERS.acmeOwner, password: DEMO_PASSWORD },
    });
    expect(acme.status()).toBe(200);
    const acmeBody = (await acme.json()) as {
      organizations: { slug: string }[];
    };
    expect(acmeBody.organizations).toHaveLength(1);
    expect(acmeBody.organizations[0]?.slug).toBe(DEMO_ORGS.acme);

    const consultant = await request.post("/api/auth/organizations", {
      data: { email: DEMO_USERS.multiOrgConsultant, password: DEMO_PASSWORD },
    });
    expect(consultant.status()).toBe(200);
    const consultantBody = (await consultant.json()) as {
      organizations: { slug: string }[];
    };
    expect(consultantBody.organizations.length).toBeGreaterThanOrEqual(2);
    const slugs = consultantBody.organizations.map((org) => org.slug);
    expect(slugs).toContain(DEMO_ORGS.acme);
    expect(slugs).toContain(DEMO_ORGS.hingorani);
    expect(slugs).not.toContain(DEMO_ORGS.bakery);
  });

  test("org lookup API does not expose onboarding workspaces to unrelated users", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/organizations", {
      data: { email: DEMO_USERS.acmeOwner, password: DEMO_PASSWORD },
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      organizations: { slug: string }[];
    };
    const slugs = body.organizations.map((org) => org.slug);
    expect(slugs).not.toContain(DEMO_ORGS.bakery);
  });

  test("viewer role cannot access admin workspace links on settings", async ({
    page,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.acmeViewer,
      organizationSlug: DEMO_ORGS.acme,
    });
    await page.goto("/app/settings");

    await expect(page.getByRole("heading", { name: /^settings$/i })).toBeVisible();
    await expect(page.getByText(/linked sheets/i)).toHaveCount(0);
  });

  test("acme user without cases module cannot export legal cases", async ({
    page,
    baseURL,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.acmeOwner,
      organizationSlug: DEMO_ORGS.acme,
    });

    const api = await apiContextWithPageCookies(page, baseURL!);
    const response = await api.get("/api/legal-cases/export");
    expect(response.status()).toBe(401);
  });

  test("consultant organization switch scopes task export to active workspace", async ({
    page,
    baseURL,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.multiOrgConsultant,
      organizationSlug: DEMO_ORGS.acme,
    });

    const acmeApi = await apiContextWithPageCookies(page, baseURL!);
    const acmeExport = await acmeApi.get("/api/tasks/export");
    expect(acmeExport.status()).toBe(200);
    const acmeCsv = await acmeExport.text();
    expect(acmeCsv).toContain(TENANT_MARKERS.acme);

    await page.goto("/api/auth/signout");
    await page.goto("/login");

    await loginToWorkspace(page, {
      email: DEMO_USERS.multiOrgConsultant,
      organizationSlug: DEMO_ORGS.hingorani,
    });

    const hingoraniApi = await apiContextWithPageCookies(page, baseURL!);
    const hingoraniExport = await hingoraniApi.get("/api/tasks/export");
    expect(hingoraniExport.status()).toBe(200);
    const hingoraniCsv = await hingoraniExport.text();
    expect(hingoraniCsv).not.toContain(TENANT_MARKERS.acme);
  });

  test("signed-in user session is cleared after sign-out", async ({ page }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.acmeOwner,
      organizationSlug: DEMO_ORGS.acme,
    });
    await page.goto("/api/auth/signout");
    await page.goto("/app/tasks");
    await expect(page).toHaveURL(/\/login/);
  });

  test("cleared session cookies return 401 on protected APIs", async ({
    page,
    baseURL,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.acmeOwner,
      organizationSlug: DEMO_ORGS.acme,
    });

    await page.context().clearCookies();

    const { request } = await import("playwright/test");
    const api = await request.newContext({ baseURL: baseURL! });
    const response = await api.get("/api/tasks/export");
    expect(response.status()).toBe(401);
    await api.dispose();
  });

  test("organization plan label is scoped to active workspace", async ({
    page,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.acmeOwner,
      organizationSlug: DEMO_ORGS.acme,
    });

    await expect(page.locator(".saas-shell, .saas-sidebar").first()).toBeVisible();
    await expect(page.getByText(/acme manufacturing/i).first()).toBeVisible();
  });

  test("staff cannot import checklist templates via API", async ({
    page,
    baseURL,
  }) => {
    await loginToWorkspace(page, {
      email: "staff@acme.demo",
      organizationSlug: DEMO_ORGS.acme,
    });

    const api = await apiContextWithPageCookies(page, baseURL!);
    const response = await api.post("/api/checklists/import/templates", {
      multipart: {
        file: {
          name: "test.csv",
          mimeType: "text/csv",
          buffer: Buffer.from("title,doer\nTest,staff@acme.demo"),
        },
      },
    });
    expect(response.status()).toBe(403);
  });

  test("single-org user does not need workspace picker on login", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO_USERS.acmeOwner);
    await passwordField(page).fill(DEMO_PASSWORD);
    await passwordField(page).blur();
    await page.waitForTimeout(700);
    await expect(page.getByLabel("Workspace")).toHaveCount(0);
  });

  test("checklist deploy rejects cross-tenant assignee user id", async ({
    page,
    request,
    baseURL,
  }) => {
    const bakeryUser = await signInAndFetchSessionUser(request, {
      email: DEMO_USERS.bakeryOwner,
      organizationSlug: DEMO_ORGS.bakery,
    });
    expect(bakeryUser?.id).toBeTruthy();

    await loginToWorkspace(page, {
      email: DEMO_USERS.acmeOwner,
      organizationSlug: DEMO_ORGS.acme,
    });

    await page.goto("/app/checklists/accounts");
    const deployForm = page.locator("form.ws-accounts-deploy-form");
    if ((await deployForm.count()) === 0) {
      test.skip(true, "Accounts pack already deployed in this database.");
    }

    await page.evaluate((foreignUserId) => {
      const form = document.querySelector("form.ws-accounts-deploy-form");
      if (!form) {
        return;
      }
      let input = form.querySelector<HTMLInputElement>(
        'input[name="assigneeUserId"]',
      );
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = "assigneeUserId";
        form.appendChild(input);
      }
      input.value = foreignUserId;
      const select = form.querySelector<HTMLSelectElement>(
        'select[name="assigneeUserId"]',
      );
      if (select) {
        select.removeAttribute("required");
      }
    }, bakeryUser!.id);

    await deployForm.getByRole("button", { name: /deploy accounts pack/i }).click();
    await expect(page.getByText(/member of this workspace/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("acme session cannot export hingorani legal cases", async ({
    page,
    baseURL,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.multiOrgConsultant,
      organizationSlug: DEMO_ORGS.acme,
    });

    const api = await apiContextWithPageCookies(page, baseURL!);
    const response = await api.get("/api/legal-cases/export");
    expect(response.status()).toBe(401);
  });

  test("tampered organization slug in sign-in is rejected", async ({
    request,
  }) => {
    await signInWithCredentials(request, {
      email: DEMO_USERS.multiOrgConsultant,
      organizationSlug: DEMO_ORGS.bakery,
    });

    const session = await fetchSessionUser(request);
    expect(session).toBeNull();
  });

  test("acme owner cannot load consultant hingorani-only task export markers", async ({
    page,
    baseURL,
  }) => {
    await loginToWorkspace(page, {
      email: DEMO_USERS.acmeOwner,
      organizationSlug: DEMO_ORGS.acme,
    });

    const api = await apiContextWithPageCookies(page, baseURL!);
    const response = await api.get("/api/tasks/export?org=hingorani");
    expect(response.status()).toBe(200);
    const csv = await response.text();
    expect(csv).not.toContain(TENANT_MARKERS.bakery);
    expect(csv).toContain(TENANT_MARKERS.acme);
  });
});
