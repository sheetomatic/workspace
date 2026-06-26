import { expect, test } from "playwright/test";

test.describe("tenant isolation smoke", () => {
  test("unauthenticated /app redirects to login", async ({ page }) => {
    await page.goto("/app/tasks");
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

  test("marketing home exposes SaaS conversion sections", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /three problems we solve/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /from voice note to assigned task/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /operational msme/i })).toBeVisible();
  });

  test("login page has workspace sign-in and org lookup fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /sign in to workspace/i }),
    ).toBeVisible();
  });
});

test.describe("tenant slug routing", () => {
  test("unknown tenant login path returns 200 with org query", async ({ page }) => {
    const response = await page.goto("/login?org=nonexistent-tenant-xyz");
    expect(response?.status()).toBe(200);
  });
});
