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
    expect(parsed?.bots).toEqual([]);
  });

  it("keeps AppSheet security fields", () => {
    const base = createEmptyConfig("Secure Desk");
    const parsed = parseAppBuilderConfig({
      ...base,
      meta: {
        ...base.meta,
        allowedEmails: ["asha@firm.com"],
        allowedDomain: "firm.com",
        runAs: "user",
      },
      views: [
        {
          id: "leads",
          hub: "App",
          name: "Leads",
          kind: "deck",
          tab: "Leads",
          cols: ["Name", "Email"],
          securityFilter: "[Email]=USEREMAIL()",
        },
      ],
      related: [],
      users: [
        {
          id: "s",
          name: "Asha",
          pin: "2222",
          role: "staff",
          email: "asha@firm.com",
          allowAdds: false,
          tables: ["Leads"],
        },
        {
          id: "m",
          name: "Meera",
          pin: "1111",
          role: "manager",
          email: "meera@firm.com",
        },
      ],
    });
    expect(parsed?.meta.allowedEmails).toEqual(["asha@firm.com"]);
    expect(parsed?.meta.allowedDomain).toBe("firm.com");
    expect(parsed?.views[0].securityFilter).toBe("[Email]=USEREMAIL()");
    expect(parsed?.users?.[0].tables).toEqual(["Leads"]);
    expect(parsed?.users?.[0].allowAdds).toBe(false);
    expect(parsed?.users?.[1].role).toBe("manager");
  });

  it("keeps slices and column behavior formulas", () => {
    const base = createEmptyConfig("Desk");
    const parsed = parseAppBuilderConfig({
      ...base,
      views: [
        {
          id: "menu",
          hub: "App",
          name: "Menu",
          kind: "deck",
          tab: "Menu",
          cols: ["Name"],
          sliceId: "direct",
          addFields: [
            {
              name: "qty",
              label: "Qty",
              col: "Qty",
              type: "number",
              showIf: '[Stage]="Won"',
              validIf: "[Qty]>0",
              invalidMessage: "Need qty",
              format: { kind: "currency", currency: "INR" },
            },
          ],
        },
      ],
      related: [],
      slices: [{ id: "direct", name: "Direct Sale", tab: "Menu", filter: '[Category]="Direct Sale"' }],
    });
    expect(parsed?.slices?.[0]?.name).toBe("Direct Sale");
    expect(parsed?.views[0].addFields?.[0].showIf).toBe('[Stage]="Won"');
    expect(parsed?.views[0].addFields?.[0].format?.kind).toBe("currency");
  });

  it("keeps bots and intelligence on a saved app", () => {
    const base = createEmptyConfig("Sales CRM");
    const parsed = parseAppBuilderConfig({
      ...base,
      views: [],
      related: [],
      bots: [
        {
          id: "lead-quote",
          name: "Quote pack",
          enabled: true,
          table: "Leads",
          event: "adds_or_updates",
          tasks: [],
        },
      ],
      intelligence: { voiceEnabled: true, aiFormulas: true },
    });
    expect(parsed?.bots?.[0]?.name).toBe("Quote pack");
    expect(parsed?.intelligence?.voiceEnabled).toBe(true);
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
