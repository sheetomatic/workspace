import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { serviceCategories, servicesBrowseCards, serviceCategoryBySlug } from "../../app/services-content";

describe("restored service wiring", () => {
  it("exposes FETMS once in the catalogue and links to the real authenticated route", () => {
    expect(serviceCategories.filter(c => c.slug === "field-tracking")).toHaveLength(1);
    expect(servicesBrowseCards.some(c => c.slug === "field-tracking")).toBe(true);
    expect(serviceCategoryBySlug["field-tracking"].workspaceHref).toContain("callbackUrl=%2Fapp%2Ffield");
    const fieldPage = readFileSync("src/app/app/field/page.tsx", "utf8");
    expect(fieldPage).toContain('requireSession(undefined, { module: "HR" })');
    expect(fieldPage).toContain('allowed("field")');
    expect(fieldPage).toContain('FieldMapBoard');
  });
  it("retains both approved FMS video IDs on the flow service", () => {
    const source = readFileSync("src/components/marketing/services-category-content.tsx", "utf8");
    expect(source).toContain('youtubeId: "PM8E3mCw67Q"');
    expect(source).toContain('youtubeId: "acTJOocmuZM"');
    expect(source).toContain('slug === "flow"');
  });
  it("preserves existing service routes", () => {
    for (const slug of ["flow", "inventory", "checklist", "tasks", "hr", "crm", "mis", "whatsapp-ai", "automation"])
      expect(serviceCategories.some(c => c.slug === slug)).toBe(true);
  });
});
