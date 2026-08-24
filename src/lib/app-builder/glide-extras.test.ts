import { describe, expect, it } from "vitest";
import { applyAction, enrichRow, evaluateComputed, isImageUrl, visibilityAllows } from "./glide-extras";
import type { AppComputedColumn, AppConfig, SheetRow } from "./index";

const row: SheetRow = {
  _row: 2,
  cells: { Qty: 10, Rate: 52, Status: "Open", Party: "SM Traders" },
};

const config: AppConfig = {
  meta: { name: "Demo", version: 1 },
  hubs: ["App"],
  views: [],
  related: [
    {
      id: "party-rel",
      name: "Party",
      parentViewId: "orders",
      childTab: "Parties",
      parentKeys: ["Party"],
      childKeys: ["Party Name"],
      cols: ["Phone"],
    },
  ],
};

const sheet = {
  listRows: () => [
    { _row: 2, cells: { "Party Name": "SM Traders", Phone: "9876543210" } },
  ],
};

describe("glide extras", () => {
  it("multiplies Qty × Rate", () => {
    const column: AppComputedColumn = {
      id: "amt",
      tab: "Order Lines",
      name: "Line Amount",
      kind: "math",
      leftCol: "Qty",
      op: "mul",
      rightCol: "Rate",
    };
    expect(evaluateComputed(column, row, config, sheet)).toBe(520);
  });

  it("looks up a parent column from a child row", () => {
    const child: SheetRow = {
      _row: 2,
      cells: { "Order No": "SO-1", Party: "SM Traders" },
    };
    const withViews: AppConfig = {
      ...config,
      views: [
        {
          id: "parties",
          hub: "App",
          name: "Parties",
          kind: "deck",
          tab: "Parties",
          cols: ["Party Name", "Phone"],
        },
        {
          id: "orders",
          hub: "App",
          name: "Orders",
          kind: "deck",
          tab: "Orders",
          cols: ["Order No", "Party"],
        },
      ],
      related: [
        {
          id: "party-orders",
          name: "Orders",
          parentViewId: "parties",
          childTab: "Orders",
          parentKeys: ["Party Name"],
          childKeys: ["Party"],
          cols: ["Order No"],
        },
      ],
    };
    const parentSheet = {
      listRows: (tab: string) =>
        tab === "Parties"
          ? [{ _row: 2, cells: { "Party Name": "SM Traders", Phone: "9876543210" } }]
          : [],
    };
    expect(
      evaluateComputed(
        {
          id: "phone",
          tab: "Orders",
          name: "Party Phone",
          kind: "lookup",
          relationId: "party-orders",
          lookupCol: "Phone",
        },
        child,
        withViews,
        parentSheet,
      ),
    ).toBe("9876543210");
  });

  it("looks up a related phone", () => {
    const column: AppComputedColumn = {
      id: "phone",
      tab: "Orders",
      name: "Party Phone",
      kind: "lookup",
      relationId: "party-rel",
      lookupCol: "Phone",
    };
    expect(evaluateComputed(column, row, config, sheet)).toBe("9876543210");
  });

  it("runs if-then-else on status", () => {
    const column: AppComputedColumn = {
      id: "flag",
      tab: "Orders",
      name: "Flag",
      kind: "if",
      whenCol: "Status",
      whenOp: "eq",
      whenValue: "Open",
      thenValue: "Needs action",
      elseValue: "Ok",
    };
    expect(evaluateComputed(column, row, config, sheet)).toBe("Needs action");
  });

  it("hides a field from staff and keeps it for owners", () => {
    expect(
      visibilityAllows({ id: "1", target: "field", targetId: "Amount", when: "owner" }, "staff", row),
    ).toBe(false);
    expect(
      visibilityAllows({ id: "1", target: "field", targetId: "Amount", when: "owner" }, "owner", row),
    ).toBe(true);
  });

  it("sets a column and notifies from an action sequence", () => {
    const result = applyAction(
      {
        id: "done",
        label: "Mark done",
        viewId: "orders",
        steps: [
          { kind: "set", col: "Status", value: "Done" },
          { kind: "notify", message: "Updated by {{user}}" },
          { kind: "go", screen: "collection" },
        ],
      },
      row,
      "Ravi",
    );
    expect(result.cells.Status).toBe("Done");
    expect(result.notify).toBe("Updated by Ravi");
    expect(result.go).toBe("collection");
  });

  it("detects image URLs", () => {
    expect(isImageUrl("https://files.example.com/item.png")).toBe(true);
    expect(isImageUrl("SM Traders")).toBe(false);
  });

  it("writes computed values onto the row", () => {
    const enriched = enrichRow(
      row,
      "Order Lines",
      {
        ...config,
        computed: [
          {
            id: "amt",
            tab: "Order Lines",
            name: "Line Amount",
            kind: "math",
            leftCol: "Qty",
            op: "mul",
            rightCol: "Rate",
          },
        ],
      },
      sheet,
    );
    expect(enriched.cells["Line Amount"]).toBe(520);
  });
});
