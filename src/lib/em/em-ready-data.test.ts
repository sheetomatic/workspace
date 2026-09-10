import { describe, expect, it } from "vitest";
import { buildImsMisRows, isImsEmException } from "@/lib/em/em-ready-data";

describe("EM IMS exceptions", () => {
  it("treats below-min and reorder as EM exceptions", () => {
    expect(isImsEmException("red")).toBe(true);
    expect(isImsEmException("orange")).toBe(true);
    expect(isImsEmException("green")).toBe(false);
    expect(isImsEmException("blue")).toBe(false);
  });

  it("builds Stores KRA rows for low stock", () => {
    const rows = buildImsMisRows([
      {
        item: {
          id: "item-1",
          code: "RM-01",
          name: "Copper",
          uom: "kg",
        },
        usableQty: 2,
        status: "red",
      },
      {
        item: {
          id: "item-2",
          code: "RM-02",
          name: "Healthy",
          uom: "kg",
        },
        usableQty: 40,
        status: "green",
      },
    ] as Parameters<typeof buildImsMisRows>[0]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      owner: "Stores",
      delayed: true,
      score: 0,
      href: "/app/ims/stock",
      title: "RM-01 Copper",
    });
  });
});
