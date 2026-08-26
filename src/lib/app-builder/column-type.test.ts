import { describe, expect, it } from "vitest";
import { createEmptyConfig } from "./index";
import { fieldFromColumn } from "./infer";
import { fieldTypeOf, withColumnType } from "./column-type";

describe("column types", () => {
  it("adds a typed column onto the matching screen", () => {
    const config = createEmptyConfig("Demo");
    const next = withColumnType(
      {
        ...config,
        views: [
          {
            id: "orders",
            hub: "App",
            name: "Orders",
            kind: "deck",
            tab: "Orders",
            cols: ["Order No"],
            addFields: [fieldFromColumn("Order No")],
            editFields: [fieldFromColumn("Order No")],
          },
        ],
      },
      "Orders",
      "Amount",
      "number",
    );
    const view = next.views[0];
    expect(view.cols).toContain("Amount");
    expect(view.addFields?.find((f) => f.col === "Amount")?.type).toBe("number");
    expect(fieldTypeOf(view, "Amount")).toBe("number");
  });

  it("changes the type of an existing column", () => {
    const config = createEmptyConfig("Demo");
    const started = withColumnType(
      {
        ...config,
        views: [
          {
            id: "leads",
            hub: "App",
            name: "Leads",
            kind: "deck",
            tab: "Leads",
            cols: ["Phone"],
            addFields: [fieldFromColumn("Phone")],
          },
        ],
      },
      "Leads",
      "Phone",
      "text",
    );
    expect(fieldTypeOf(started.views[0], "Phone")).toBe("text");
  });

  it("stores a virtual AppSheet formula on the table", () => {
    const config = createEmptyConfig("Demo");
    const next = withColumnType(
      {
        ...config,
        views: [
          {
            id: "leads",
            hub: "App",
            name: "Leads",
            kind: "deck",
            tab: "Leads",
            cols: ["Name", "Company"],
          },
        ],
      },
      "Leads",
      "Label",
      "virtual",
      [],
      { formula: 'CONCATENATE([Name]," — ",[Company])' },
    );
    expect(next.computed?.[0]?.kind).toBe("formula");
    expect(next.computed?.[0]?.formula).toContain("[Name]");
  });
});
