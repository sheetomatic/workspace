import { describe, expect, it } from "vitest";
import { createEmptyConfig } from "@/lib/app-builder";
import { parseAppBuilderConfig, parseAppBuilderStudioInput } from "@/lib/app-builder/persist";

describe("parseAppBuilderConfig", () => {
  it("rejects empty or unnamed configs", () => {
    expect(parseAppBuilderConfig(null)).toBeNull();
    expect(parseAppBuilderConfig({ meta: { name: "" }, views: [], related: [] })).toBeNull();
  });

  it("keeps the app name from a valid studio config", () => {
    const parsed = parseAppBuilderConfig(createEmptyConfig("Orders Desk"));
    expect(parsed?.meta.name).toBe("Orders Desk");
    expect(parsed?.views).toEqual([]);
  });
});

describe("parseAppBuilderStudioInput", () => {
  it("requires a workbook with at least one tab", () => {
    expect(
      parseAppBuilderStudioInput({
        config: createEmptyConfig("Orders Desk"),
        workbook: { title: "Sheet", tabs: {} },
      }),
    ).toBeNull();
  });

  it("accepts a config plus a one-tab workbook", () => {
    const parsed = parseAppBuilderStudioInput({
      config: createEmptyConfig("Orders Desk"),
      templateId: "orders",
      workbook: {
        title: "Orders",
        tabs: {
          Orders: {
            headers: ["Order No", "Party"],
            rows: [{ cells: { "Order No": "1", Party: "GMK" } }],
          },
        },
      },
    });
    expect(parsed?.name).toBe("Orders Desk");
    expect(parsed?.templateId).toBe("orders");
    expect(parsed?.workbook.tabs.Orders.headers).toEqual(["Order No", "Party"]);
  });
});
