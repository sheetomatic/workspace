import { describe, expect, it } from "vitest";
import { marketingNavIsActive } from "./marketing-navigation";
describe("marketing navigation active tab", () => {
  it("keeps the section selected on nested pages", () => {
    expect(marketingNavIsActive("/services/flow", "/services")).toBe(true);
    expect(marketingNavIsActive("/courses", "/courses")).toBe(true);
  });
  it("does not select unrelated or prefix-only matches", () => {
    expect(marketingNavIsActive("/services-old", "/services")).toBe(false);
    expect(marketingNavIsActive("/pricing", "/services")).toBe(false);
    expect(marketingNavIsActive("/", "/services")).toBe(false);
  });
  it("matches home exactly", () => {
    expect(marketingNavIsActive("/", "/")).toBe(true);
    expect(marketingNavIsActive("/pricing", "/")).toBe(false);
  });
});
