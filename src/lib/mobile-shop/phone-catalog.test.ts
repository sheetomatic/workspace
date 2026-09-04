import { describe, expect, it } from "vitest";
import { parseInboundLines } from "@/lib/mobile-shop/inbound";
import {
  searchPhoneCatalog,
  uniquePhoneCatalog,
} from "@/lib/mobile-shop/phone-catalog";

const catalog = uniquePhoneCatalog([
  { kind: "PHONE", brand: "Samsung", model: "A15", color: "Black", condition: "NEW" },
  { kind: "PHONE", brand: "Samsung", model: "A15", color: "Blue", condition: "NEW" },
  { kind: "PHONE", brand: "Redmi", model: "Note 13", color: "Black", condition: "USED" },
  { kind: "PHONE", brand: "samsung", model: "A15", color: "black", condition: "NEW" },
  { kind: "ACCESSORY", brand: "Boat", model: "Rockerz", color: "Black" },
  { kind: "PHONE", brand: "", model: "", color: "" },
]);

describe("uniquePhoneCatalog", () => {
  it("keeps distinct make + model + color and skips accessories", () => {
    expect(catalog).toEqual([
      { brand: "Redmi", model: "Note 13", color: "Black", condition: "USED" },
      { brand: "Samsung", model: "A15", color: "Black", condition: "NEW" },
      { brand: "Samsung", model: "A15", color: "Blue", condition: "NEW" },
    ]);
  });
});

describe("searchPhoneCatalog", () => {
  it("filters as they type by make, model, and color", () => {
    expect(searchPhoneCatalog(catalog, "sam a15").map((row) => row.color)).toEqual([
      "Black",
      "Blue",
    ]);
    expect(searchPhoneCatalog(catalog, "black").map((row) => `${row.brand} ${row.model}`)).toEqual(
      ["Redmi Note 13", "Samsung A15"],
    );
    expect(searchPhoneCatalog(catalog, "note").map((row) => row.model)).toEqual(["Note 13"]);
    expect(searchPhoneCatalog(catalog, "no-such-phone")).toEqual([]);
  });

  it("auto-fill payload is brand, model, color, and stored condition", () => {
    const [hit] = searchPhoneCatalog(catalog, "redmi note black");
    expect(hit).toEqual({
      brand: "Redmi",
      model: "Note 13",
      color: "Black",
      condition: "USED",
    });
  });
});

describe("parseInboundLines", () => {
  it("accepts invoice child rows and rejects duplicate IMEI", () => {
    const parsed = parseInboundLines([
      {
        kind: "PHONE",
        brand: "Samsung",
        model: "A15",
        color: "Black",
        imei: "111",
        condition: "NEW",
      },
      { kind: "ACCESSORY", name: "Cover", qty: 4 },
      { kind: "PHONE", brand: "", model: "", imei: "" },
    ]);
    expect(parsed).toEqual({
      ok: true,
      lines: [
        {
          kind: "PHONE",
          brand: "Samsung",
          model: "A15",
          color: "Black",
          imei: "111",
          condition: "NEW",
        },
        { kind: "ACCESSORY", name: "Cover", qty: 4 },
      ],
    });
    expect(
      parseInboundLines([
        { kind: "PHONE", brand: "A", model: "B", imei: "111" },
        { kind: "PHONE", brand: "A", model: "B", imei: "111" },
      ]).ok,
    ).toBe(false);
  });
});
