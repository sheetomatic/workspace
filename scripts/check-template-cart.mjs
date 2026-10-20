import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.TEMPLATE_TEST_URL || "http://127.0.0.1:3140";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error(
    "Local fixtures only; never run payment mocks on a live site.",
  );
const browser = await chromium.launch({
  executablePath: process.env.PRICING_TEST_CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
});
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://checkout.razorpay.com/**", (route) =>
      route.abort(),
    );
    await page.goto(`${base}/templates`, { waitUntil: "networkidle" });
    assert.equal(
      await page
        .getByRole("heading", {
          name: "Useful templates. Every copy under ₹999.",
        })
        .count(),
      1,
    );
    const crm = page
      .locator(".tpl-shop-card")
      .filter({
        has: page.getByRole("heading", {
          name: "CRM Lead Sheet Template",
          exact: true,
        }),
      });
    const app = page
      .locator(".tpl-shop-card")
      .filter({
        has: page.getByRole("heading", {
          name: "HRMS – Attendance & Leave (AppSheet)",
          exact: true,
        }),
      });
    await crm.getByRole("button", { name: "Add to cart", exact: true }).click();
    await app.getByRole("button", { name: "Add to cart", exact: true }).click();
    assert(
      await crm.getByRole("button", { name: "Added to cart" }).isDisabled(),
    );
    assert(
      (await page.locator(".tpl-cart-totals").innerText()).includes("1,766.46"),
    );
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(await page.locator(".tpl-cart-lines li").count(), 2);
    await page.getByRole("combobox").selectOption("27");
    assert(
      (await page.locator(".tpl-cart-totals").innerText()).includes(
        "IGST (18%)",
      ),
    );
    await page.getByRole("combobox").selectOption("22");
    assert(
      (await page.locator(".tpl-cart-totals").innerText()).includes(
        "CGST (9%)",
      ),
    );
    await page
      .getByRole("button", {
        name: "Remove CRM Lead Sheet Template",
        exact: true,
      })
      .click();
    assert(
      (await page.locator(".tpl-cart-totals").innerText()).includes("1,177.64"),
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    const fields = {
      name: "Checkout Test",
      email: "checkout@example.test",
      phone: "9999999999",
      address: "1 Test Road",
      city: "Raipur",
      pin: "492001",
    };
    for (const [name, value] of Object.entries(fields))
      await page.locator(`input[name="${name}"]`).fill(value);
    await page.getByRole("checkbox").check();
    const result = {
      id: "fixture-order",
      paid: false,
      invoiceNumber: null,
      totalPaise: 117764,
      keyId: "rzp_test_fixture",
      gatewayOrderId: "order_fixture",
      lines: [{ name: "HRMS", priceInr: 998 }],
    };
    let posted;
    await page.route(`${base}/api/templates/checkout`, async (route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({ json: result });
    });
    await page.route(`${base}/api/templates/checkout/fixture-order`, (route) =>
      route.fulfill({
        json: {
          ...result,
          paid: true,
          invoiceNumber: "ST2627/00000001",
          lines: [
            {
              name: "HRMS",
              priceInr: 998,
              copyLink: "https://example.test/copy",
            },
          ],
        },
      }),
    );
    await page.evaluate(() => {
      window.Razorpay = class {
        constructor(options) {
          this.options = options;
        }
        open() {
          window.__gateway = this.options;
          this.options.handler({
            razorpay_order_id: "order_fixture",
            razorpay_payment_id: "pay_fixture",
            razorpay_signature: "fixture",
          });
        }
        on() {}
      };
    });
    await page.getByRole("button", { name: /Pay .* securely/ }).click();
    await page
      .getByRole("heading", { name: "Payment verified", exact: true })
      .waitFor();
    assert.equal(posted.productIds.length, 1);
    assert.equal(posted.acceptedTerms, true);
    assert.equal(posted.buyer.stateCode, "22");
    assert(!("totalPaise" in posted));
    assert.equal(await page.evaluate(() => window.__gateway.amount), 117764);
    assert(
      await page
        .getByRole("button", { name: "Download tax invoice" })
        .isVisible(),
    );
    assert.equal(
      await page.getByRole("link", { name: "Open HRMS" }).getAttribute("href"),
      "https://example.test/copy",
    );
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: `/tmp/template-cart-${width}.png`,
      fullPage: true,
    });
    console.log(
      `PASS ${width}px: cart add/remove/persistence, duplicate prevention, state GST, exact paise checkout, mocked verified-payment UI, no overflow/errors`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
