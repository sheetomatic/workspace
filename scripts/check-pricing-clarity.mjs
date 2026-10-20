/** Run against an already-started local Next server; never submits an enquiry. */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.PRICING_TEST_URL ?? "http://127.0.0.1:3127";
if (!["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname)) {
  throw new Error("Use a local test server, not production.");
}
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PRICING_TEST_CHROMIUM_PATH || undefined,
});
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(`${baseUrl}/pricing`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator(".business-plan-card").count(), 3);
    assert.equal(await page.locator(".business-comparison-table tbody tr").count(), 13);
    assert.equal(await page.locator(".business-module-reports").count(), 3);
    for (const feature of ["Task Management & Delegation", "Reports for included modules"]) {
      const row = page.locator(".business-comparison-table tbody tr").filter({ has: page.getByRole("rowheader", { name: feature, exact: true }) });
      assert.deepEqual(await row.locator("td .sr-only").allTextContents(), ["Included", "Included", "Included"]);
    }
    for (const feature of ["Field Executive Tracking", "Conveyance Expenses", "Payment Systems"]) {
      const row = page.locator(".business-comparison-table tbody tr").filter({ has: page.getByRole("rowheader", { name: feature, exact: true }) });
      assert.deepEqual(await row.locator("td .sr-only").allTextContents(), ["Not included", "Not included", "Included"]);
    }
    for (const [id, price] of [["starter", "₹4,999"], ["scale", "₹6,999"], ["enterprise", "₹9,999"]]) {
      const card = page.locator(`#plan-${id}`);
      assert.equal(await card.locator(".business-plan-price strong").textContent(), price);
      const fit = await card.locator(".business-plan-fit").textContent();
      assert(fit.includes(id === "enterprise" ? "FMS, IMS / Stock and Checklists together" : "IMS / Stock is not included"));
      for (const intent of ["trial", "demo"]) {
        const link = card.locator(`a.business-plan-${intent}`);
        assert((await link.textContent()).includes("Request"));
        const url = new URL(await link.getAttribute("href"));
        assert.equal(url.origin, "https://wa.me");
        assert(url.searchParams.get("text").includes(price));
        assert(url.searchParams.get("text").includes("GST extra"));
        assert.equal(await link.getAttribute("aria-describedby"), "business-enquiry-note");
      }
    }
    const ims = page.locator(".business-comparison-table tbody tr").filter({ has: page.getByRole("rowheader", { name: "IMS / Stock", exact: true }) });
    assert.deepEqual(await ims.locator("td .sr-only").allTextContents(), ["Not included", "Not included", "Included"]);
    await page.locator('.business-bundle-note a[href="#plan-enterprise"]').click();
    assert.equal(new URL(page.url()).hash, "#plan-enterprise");
    const faq = page.locator(".business-pricing-faq details").nth(2);
    await faq.locator("summary").click();
    assert(await faq.evaluate((element) => element.open));
    assert(await faq.locator("p").isVisible());
    await faq.locator("summary").press("Enter");
    assert.equal(await faq.evaluate((element) => element.open), false);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Page overflows at ${width}px`);
    assert.deepEqual(errors, []);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `/tmp/pricing-clarity-${width}.png`, fullPage: true });
    console.log(`PASS ${width}px: prices, inclusions, WhatsApp requests, anchors, FAQ keyboard interaction, overflow and runtime errors`);
    await page.close();
  }
} finally {
  await browser.close();
}
