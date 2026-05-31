import { chromium } from "playwright";
import fs from "fs";

const EMAIL = process.env.GRAPHY_EMAIL;
const PASSWORD = process.env.GRAPHY_PASSWORD;

async function dumpPage(page, label) {
  const html = await page.content();
  fs.writeFileSync(`/tmp/graphy-${label}.html`, html);
  await page.screenshot({ path: `/tmp/graphy-${label}.png`, fullPage: true });
  console.log(label, "URL:", page.url(), "TITLE:", await page.title());
  const inputs = await page.locator("input, textarea").evaluateAll((els) =>
    els.map((el) => ({
      type: el.getAttribute("type"),
      name: el.getAttribute("name"),
      id: el.getAttribute("id"),
      placeholder: el.getAttribute("placeholder"),
      visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
    })),
  );
  console.log(label, "INPUTS:", JSON.stringify(inputs, null, 2));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://sheetomatic.graphy.com/t/public/login", {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  for (const wait of [3000, 5000, 10000]) {
    await page.waitForTimeout(wait);
    await dumpPage(page, `login-wait-${wait}`);
    if ((await page.locator("input").count()) > 0) break;
  }

  // Check shadow roots
  const shadowHosts = await page.evaluate(() => {
    const all = [...document.querySelectorAll("*")];
    return all.filter((el) => el.shadowRoot).map((el) => el.tagName);
  });
  console.log("SHADOW HOSTS:", shadowHosts);

  if (EMAIL && PASSWORD && (await page.locator("input").count()) > 0) {
    await page.locator('input[type="email"], input[type="text"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"], button').filter({ hasText: /log in|login|sign in/i }).first().click();
    await page.waitForTimeout(15000);
    await dumpPage(page, "after-login");
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
