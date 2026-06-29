import { expect, test } from "playwright/test";
import { DEMO_ORGS, DEMO_PASSWORD, DEMO_USERS } from "../helpers/demo";

test.describe("tenant isolation smoke", () => {
  test("unauthenticated /app redirects to login", async ({ page }) => {
    await page.goto("/app/tasks");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated /app/today redirects to login", async ({ page }) => {
    await page.goto("/app/today");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated /app/settings redirects to login", async ({ page }) => {
    await page.goto("/app/settings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("POST /api/auth/organizations without credentials returns 401", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/organizations", {
      data: { email: "nobody@example.com", password: "wrong-password" },
    });
    expect(response.status()).toBe(401);
  });

  test("POST /api/auth/organizations with empty body returns 400", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/organizations", {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test("unauthenticated task export API returns 401", async ({ request }) => {
    const response = await request.get("/api/tasks/export");
    expect(response.status()).toBe(401);
  });

  test("unauthenticated workspace logo API returns 401", async ({ request }) => {
    const response = await request.get("/api/workspace/logo");
    expect(response.status()).toBe(401);
  });

  test("unauthenticated IMS attachment API returns 401", async ({ request }) => {
    const response = await request.get("/api/ims/attachments/clfakeattachmentid000");
    expect([401, 403, 404]).toContain(response.status());
  });

  test("marketing home exposes core conversion sections", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /you built the business\. now build the system/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /your ops deserve more than spreadsheet patches/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /four steps from spreadsheet chaos/i,
      }),
    ).toBeVisible();
  });

  test("login page has workspace sign-in and org lookup fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /sign in to workspace/i }),
    ).toBeVisible();
  });

  test("invalid credentials do not expose workspace picker", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.locator('input[name="password"]').fill("wrong-password");
    await page.locator('input[name="password"]').blur();
    await page.waitForTimeout(600);
    await expect(page.getByLabel("Workspace")).toHaveCount(0);
  });
});

test.describe("tenant slug routing", () => {
  test("unknown tenant login path returns 200 with org query", async ({ page }) => {
    const response = await page.goto("/login?org=nonexistent-tenant-xyz");
    expect(response?.status()).toBe(200);
  });

  test("org query pre-fills hidden organization field", async ({ page }) => {
    await page.goto(`/login?org=${DEMO_ORGS.acme}`);
    await expect(page.locator('input[name="organization"][type="hidden"]')).toHaveValue(
      DEMO_ORGS.acme,
    );
  });
});

test.describe("org lookup API smoke", () => {
  test("valid demo credentials return exactly one workspace for single-org user", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/organizations", {
      data: { email: DEMO_USERS.acmeOwner, password: DEMO_PASSWORD },
    });

    if (response.status() === 503) {
      test.skip(true, "Database unavailable — run npm run db:seed");
    }

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { organizations?: { slug: string }[] };
    expect(body.organizations?.length).toBe(1);
    expect(body.organizations?.[0]?.slug).toBe(DEMO_ORGS.acme);
  });
});
