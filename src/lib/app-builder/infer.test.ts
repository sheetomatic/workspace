import { describe, expect, it } from "vitest";
import { inferAppFromWorkbook, inferFieldType, columnsMatch } from "./infer";
import type { SheetWorkbook } from "./index";

const demo: SheetWorkbook = {
  title: "Demo Orders Sheet",
  tabs: {
    Orders: {
      name: "Orders",
      headers: ["Order No", "Date", "Party", "Status", "Amount"],
      rows: [
        {
          _row: 2,
          cells: {
            "Order No": "SO-1001",
            Date: "18/08/2026",
            Party: "SM Traders",
            Status: "Open",
            Amount: 125000,
          },
        },
        {
          _row: 3,
          cells: {
            "Order No": "SO-1002",
            Date: "19/08/2026",
            Party: "East Steel",
            Status: "Dispatched",
            Amount: 84000,
          },
        },
      ],
    },
    "Order Lines": {
      name: "Order Lines",
      headers: ["Order No", "Item", "Qty", "Rate", "Line Amount"],
      rows: [
        { _row: 2, cells: { "Order No": "SO-1001", Item: "TMT 12mm", Qty: 10, Rate: 5200 } },
        { _row: 3, cells: { "Order No": "SO-1001", Item: "TMT 16mm", Qty: 14, Rate: 5214 } },
        { _row: 4, cells: { "Order No": "SO-1002", Item: "TMT 10mm", Qty: 20, Rate: 4200 } },
      ],
    },
    Parties: {
      name: "Parties",
      headers: ["Party Name", "Phone", "City"],
      rows: [
        { _row: 2, cells: { "Party Name": "SM Traders", Phone: "9876543210", City: "Raipur" } },
        { _row: 3, cells: { "Party Name": "East Steel", Phone: "9123456780", City: "Bilaspur" } },
      ],
    },
  },
};

describe("inferAppFromWorkbook", () => {
  it("hides helper sheets from the phone home", () => {
    const app = inferAppFromWorkbook({
      title: "Ops",
      tabs: {
        Sales: {
          name: "Sales",
          headers: ["Id"],
          rows: [{ _row: 2, cells: { Id: "KE-1" } }],
        },
        Pivot: {
          name: "Pivot",
          headers: ["A"],
          rows: [{ _row: 2, cells: { A: "1" } }],
        },
        Import: {
          name: "Import",
          headers: ["A"],
          rows: [{ _row: 2, cells: { A: "1" } }],
        },
      },
    });
    expect(app.views.find((v) => v.tab === "Sales")?.nav).toBe(true);
    expect(app.views.find((v) => v.tab === "Pivot")?.nav).toBe(false);
    expect(app.views.find((v) => v.tab === "Import")?.nav).toBe(false);
  });

  it("builds a screen per table and hides line-item tabs from nav", () => {
    const app = inferAppFromWorkbook(demo);
    expect(app.views.map((v) => v.tab)).toEqual(["Orders", "Order Lines", "Parties"]);
    expect(app.views.find((v) => v.tab === "Order Lines")?.nav).toBe(false);
    expect(app.views.find((v) => v.tab === "Orders")?.titleCol).toBe("Order No");
    expect(app.views.find((v) => v.tab === "Orders")?.statusCol).toBe("Status");
    expect(app.views.find((v) => v.tab === "Parties")?.phoneCol).toBe("Phone");
    expect(app.computed).toEqual([]);
  });

  it("adds Line Amount when Qty and Rate exist without an amount column", () => {
    const app = inferAppFromWorkbook({
      title: "Lines",
      tabs: {
        Lines: {
          name: "Lines",
          headers: ["Item", "Qty", "Rate"],
          rows: [{ _row: 2, cells: { Item: "TMT", Qty: 2, Rate: 10 } }],
        },
      },
    });
    expect(app.computed?.[0]).toMatchObject({
      name: "Line Amount",
      kind: "math",
      leftCol: "Qty",
      rightCol: "Rate",
    });
  });

  it("picks an image column named Photo", () => {
    const app = inferAppFromWorkbook({
      title: "Items",
      tabs: {
        Items: {
          name: "Items",
          headers: ["Item", "Photo"],
          rows: [{ _row: 2, cells: { Item: "TMT", Photo: "https://x.test/a.png" } }],
        },
      },
    });
    expect(app.views[0]?.imageCol).toBe("Photo");
  });

  it("wires Glide-style relations from matching keys", () => {
    const app = inferAppFromWorkbook(demo);
    const orderLines = app.related.find(
      (rel) => rel.parentViewId === "orders" && rel.childTab === "Order Lines",
    );
    expect(orderLines?.parentKeys).toEqual(["Order No"]);
    expect(orderLines?.childKeys).toEqual(["Order No"]);
    const partyOrders = app.related.find(
      (rel) => rel.parentViewId === "parties" && rel.childTab === "Orders",
    );
    expect(partyOrders?.parentKeys).toEqual(["Party Name"]);
    expect(partyOrders?.childKeys).toEqual(["Party"]);
  });

  it("turns Party into a choice sourced from Parties", () => {
    const app = inferAppFromWorkbook(demo);
    const partyField = app.views
      .find((v) => v.tab === "Orders")
      ?.addFields?.find((f) => f.col === "Party");
    expect(partyField?.choiceTab).toBe("Parties");
    expect(partyField?.choiceCol).toBe("Party Name");
  });
});

describe("inferFieldType", () => {
  it("reads column names the way Glide does", () => {
    expect(inferFieldType("Photo")).toBe("image");
    expect(inferFieldType("Mobile")).toBe("phone");
    expect(inferFieldType("Amount", [10, 20, 30])).toBe("number");
    expect(inferFieldType("Status", ["Open", "Open", "Done", "Done"])).toBe("choice");
  });

  it("matches Party to Party Name", () => {
    expect(columnsMatch("Party", "Party Name")).toBe(true);
    expect(columnsMatch("Order No", "Order No")).toBe(true);
    expect(columnsMatch("City", "Status")).toBe(false);
  });
});
