import { describe, expect, it } from "vitest";
import { createEmptyConfig } from "./index";
import { deleteColumnInConfig, deleteTabColumn, renameColumnInConfig, renameTabColumn } from "./column-mutate";

describe("column mutate", () => {
  it("renames a Sheet column and the matching view fields", () => {
    const tab = renameTabColumn(
      {
        name: "Leads",
        headers: ["Name", "Stage"],
        rows: [{ _row: 2, cells: { Name: "Amit", Stage: "New" } }],
      },
      "Name",
      "Lead",
    );
    expect(tab.headers).toEqual(["Lead", "Stage"]);
    expect(tab.rows[0]?.cells.Lead).toBe("Amit");

    const config = renameColumnInConfig(
      {
        ...createEmptyConfig("CRM"),
        views: [
          {
            id: "leads",
            hub: "App",
            name: "Leads",
            kind: "deck",
            tab: "Leads",
            titleCol: "Name",
            keyCol: "Name",
            cols: ["Name", "Stage"],
            addFields: [{ name: "Name", label: "Name", col: "Name", type: "text" }],
          },
        ],
      },
      "Leads",
      "Name",
      "Lead",
    );
    expect(config.views[0]?.titleCol).toBe("Lead");
    expect(config.views[0]?.keyCol).toBe("Lead");
    expect(config.views[0]?.cols).toEqual(["Lead", "Stage"]);
  });

  it("deletes a column from the tab and the view", () => {
    const tab = deleteTabColumn(
      {
        name: "Leads",
        headers: ["Name", "Notes"],
        rows: [{ _row: 2, cells: { Name: "Amit", Notes: "x" } }],
      },
      "Notes",
    );
    expect(tab.headers).toEqual(["Name"]);
    expect(tab.rows[0]?.cells.Notes).toBeUndefined();

    const config = deleteColumnInConfig(
      {
        ...createEmptyConfig("CRM"),
        views: [
          {
            id: "leads",
            hub: "App",
            name: "Leads",
            kind: "deck",
            tab: "Leads",
            cols: ["Name", "Notes"],
            ownerCol: "Notes",
          },
        ],
      },
      "Leads",
      "Notes",
    );
    expect(config.views[0]?.cols).toEqual(["Name"]);
    expect(config.views[0]?.ownerCol).toBeUndefined();
  });
});
