import { expect, test } from "playwright/test";

test.describe("marketing smoke", () => {
  test("GET /login returns 200 on apex host", async ({ request }) => {
    const response = await request.get("/login");
    expect(response.status()).toBe(200);
  });

  test("login page renders sign-in heading", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /sign in to workspace/i }),
    ).toBeVisible();
  });
});
