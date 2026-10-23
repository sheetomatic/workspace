import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("public image integrity", () => {
  it("ships every literal image source on the repaired marketing pages", () => {
    for (const file of ["src/app/contact/page.tsx", "src/components/marketing/sales-journey-sections.tsx"]) {
      const source = readFileSync(resolve(file), "utf8");
      const assets = [...source.matchAll(/src="(\/[^"?]+)"/g)].map(m => m[1]);
      expect(assets.length).toBeGreaterThan(0);
      for (const asset of assets) expect(existsSync(resolve(`public${asset}`)), asset).toBe(true);
    }
  });
  it("provides the contact download with the current public phone, not the API sender", () => {
    const card = readFileSync("public/contact/sheetomatic-contact.vcf", "utf8");
    expect(card).toContain("+919755733107");
    expect(card).not.toMatch(/9329103106|9685788980/);
    expect(card).toContain("BEGIN:VCARD");
    expect(readFileSync("public/contact/sheetomatic-contact-qr.svg", "utf8")).toContain("<svg");
  });
});
