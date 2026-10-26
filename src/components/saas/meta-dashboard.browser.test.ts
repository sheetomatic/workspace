import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { MetaDashboard } from "./meta-dashboard";
import styles from "./meta-dashboard.module.css";

// Native disclosure is deliberately usable before hydration and without scripts.
vi.stubGlobal("React", React);
const css = readFileSync(new URL("./meta-dashboard.module.css", import.meta.url), "utf8")
  .replace(/\.([a-zA-Z][\w-]*)/g, (full, name: string) => styles[name] ? `.${styles[name]}` : full);
let browser: Awaited<ReturnType<typeof chromium.launch>>;
beforeAll(async () => { browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true }); });
afterAll(async () => { await browser?.close();vi.unstubAllGlobals(); });
function markup(empty = false) {
  return renderToStaticMarkup(React.createElement(MetaDashboard, { days: 30, report: {
    state: "ready", daily: [], rows: [{ date_start: "2026-09-26", date_stop: "2026-10-25",
      actions: empty ? [] : [{ action_type: "link_click", value: "26" }, { action_type: "custom_action", value: "3" }],
    }],
  } }));
}
describe("Audience actions native disclosure", () => {
  it.each([1440, 390, 320])("opens by pointer and keyboard at %ipx without external requests", async width => {
    const page = await browser.newPage({ viewport: { width, height: 900 }, javaScriptEnabled: false });
    await page.route("**/*", route => route.abort());
    await page.setContent(`<style>body{margin:0}*{box-sizing:border-box}${css}</style>${markup()}`);
    const disclosure = page.locator("details").filter({ has: page.locator("summary", { hasText: "Audience actions" }) });
    const summary = disclosure.locator("summary");
    expect(await disclosure.getAttribute("open")).toBeNull();
    await summary.click();expect(await disclosure.getAttribute("open")).not.toBeNull();
    expect(await disclosure.locator("tbody tr").count()).toBe(2);
    expect(await disclosure.locator("tbody").innerText()).toContain("26");
    expect(await disclosure.locator("tbody").innerText()).toContain("custom_action");
    await summary.focus();await page.keyboard.press("Enter");expect(await disclosure.getAttribute("open")).toBeNull();
    await page.keyboard.press("Space");expect(await disclosure.getAttribute("open")).not.toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.close();
  });
  it("opens an honest empty state rather than fabricated action counts", async () => {
    const page = await browser.newPage();
    await page.setContent(markup(true));
    await page.locator("summary", { hasText: "Audience actions" }).click();
    expect(await page.getByText("No action details were returned for this period.").isVisible()).toBe(true);
    await page.close();
  });
});
