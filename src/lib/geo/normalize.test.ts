import { describe, expect, it } from "vitest";
import { isValidPlaceName, normalizePlaceName } from "@/lib/geo/normalize";

describe("geo place names", () => {
  it("trims and accepts real place names", () => {
    expect(normalizePlaceName("  Raipur  ")).toBe("Raipur");
    expect(isValidPlaceName("Chhattisgarh")).toBe(true);
    expect(isValidPlaceName("x")).toBe(false);
  });
});
