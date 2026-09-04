import { describe, expect, it } from "vitest";
import { comboSuggestions, searchNamedItems } from "@/lib/mobile-shop/addable";

describe("comboSuggestions", () => {
  it("filters as they type and offers Add new when the value is not listed", () => {
    const options = ["Plain cover", "20W charger", "Boat earphone"];
    expect(comboSuggestions(options, "cover").hits).toEqual(["Plain cover"]);
    expect(comboSuggestions(options, "cover").addNew).toBe("cover");
    expect(comboSuggestions(options, "Spigen case").addNew).toBe("Spigen case");
    expect(comboSuggestions(options, "plain cover").addNew).toBeNull();
  });
});

describe("searchNamedItems", () => {
  it("matches accessory names by every token", () => {
    const items = [
      { name: "Plain cover" },
      { name: "20W charger" },
      { name: "Boat earphone" },
    ];
    expect(searchNamedItems(items, "20w").map((row) => row.name)).toEqual(["20W charger"]);
    expect(searchNamedItems(items, "nope")).toEqual([]);
  });
});
