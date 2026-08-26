import { describe, expect, it } from "vitest";
import {
  APP_BUILDER_USP_LINE,
  APP_BUILDER_USP_PILLARS,
  APP_BUILDER_USP_ROWS,
} from "./usp";

describe("App Builder USP", () => {
  it("names both products and our Sheet story", () => {
    expect(APP_BUILDER_USP_LINE).toMatch(/AppSheet/);
    expect(APP_BUILDER_USP_LINE).toMatch(/Glide/);
    expect(APP_BUILDER_USP_LINE).toMatch(/Sheet/);
  });

  it("keeps three pillars and a compare row for each", () => {
    expect(APP_BUILDER_USP_PILLARS.map((p) => p.id)).toEqual([
      "appsheet",
      "glide",
      "us",
    ]);
    expect(APP_BUILDER_USP_ROWS.length).toBeGreaterThanOrEqual(8);
    expect(APP_BUILDER_USP_ROWS.every((row) => row.us.trim())).toBe(true);
  });
});
