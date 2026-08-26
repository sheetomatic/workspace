import { describe, expect, it } from "vitest";
import { createEmptyConfig } from "./index";
import {
  groupAggregateValue,
  groupViewRows,
  linkToViewExpr,
  orderViews,
  primaryViews,
  refViews,
  sortViewRows,
  viewLabel,
  withViewPosition,
} from "./view-options";

const rows = [
  { _row: 1, cells: { Name: "Rina", Stage: "Quote", Value: 2 } },
  { _row: 2, cells: { Name: "Amit", Stage: "Won", Value: 10 } },
  { _row: 3, cells: { Name: "Vikas", Stage: "Quote", Value: 4 } },
];

describe("AppSheet view options", () => {
  it("orders first / later / last", () => {
    const views = [
      { id: "c", name: "C", kind: "deck" as const, tab: "T", cols: [], position: "last" as const },
      { id: "a", name: "A", kind: "deck" as const, tab: "T", cols: [], position: "first" as const },
      { id: "b", name: "B", kind: "deck" as const, tab: "T", cols: [], position: "later" as const },
    ];
    expect(orderViews(views).map((view) => view.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts and groups rows", () => {
    const sorted = sortViewRows(rows, [{ col: "Name", dir: "asc" }]);
    expect(sorted.map((row) => row.cells.Name)).toEqual(["Amit", "Rina", "Vikas"]);
    const groups = groupViewRows(rows, ["Stage"]);
    expect(groups.map((group) => group.key)).toEqual(["Quote", "Won"]);
    expect(groupAggregateValue(groups[0].rows, "sum", "Value")).toBe("6");
  });

  it("reads a quoted display name and LINKTOVIEW", () => {
    expect(viewLabel({ id: "v", name: "Master", kind: "deck", tab: "T", cols: [], displayName: '"Home"' })).toBe(
      "Home",
    );
    expect(linkToViewExpr("Master")).toBe('LINKTOVIEW("Master")');
  });

  it("puts menu/ref off the primary nav", () => {
    const config = createEmptyConfig("App");
    config.views = [
      { id: "p", name: "Leads", kind: "deck", tab: "Leads", cols: [], hub: "App", ...withViewPosition("first") },
      { id: "m", name: "More", kind: "menu", tab: "Menu", cols: [], hub: "App", ...withViewPosition("menu") },
      { id: "r", name: "Form", kind: "form", tab: "Leads", cols: [], hub: "App", ...withViewPosition("ref") },
    ];
    expect(primaryViews(config).map((view) => view.id)).toEqual(["p"]);
    expect(refViews(config).map((view) => view.id)).toEqual(["r"]);
  });
});
