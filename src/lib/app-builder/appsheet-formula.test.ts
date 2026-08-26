import { describe, expect, it } from "vitest";
import {
  evaluateAppSheetFormula,
  suggestAppSheetFormula,
} from "@/lib/app-builder/appsheet-formula";

const row = {
  Name: "Amit",
  Company: "Bafna Steels",
  Stage: "Won",
  Value: 80000,
};

describe("evaluateAppSheetFormula", () => {
  it("reads columns, concatenates, and IFs like AppSheet", () => {
    expect(evaluateAppSheetFormula("[Name] & \" — \" & [Company]", { row })).toBe(
      "Amit — Bafna Steels",
    );
    expect(
      evaluateAppSheetFormula('CONCATENATE([Name]," / ",[Company])', { row }),
    ).toBe("Amit / Bafna Steels");
    expect(evaluateAppSheetFormula('IF([Stage]="Won","Closed","Open")', { row })).toBe(
      "Closed",
    );
    expect(evaluateAppSheetFormula("NUMBER([Value]) / 1000", { row })).toBe(80);
    expect(evaluateAppSheetFormula("UPPER([Name])", { row })).toBe("AMIT");
    expect(evaluateAppSheetFormula("ISBLANK([Stage])", { row })).toBe(false);
    expect(evaluateAppSheetFormula("[_THISROW].[Company]", { row })).toBe("Bafna Steels");
  });

  it("LOOKUPs a value from another table", () => {
    expect(
      evaluateAppSheetFormula('LOOKUP([Name],"Leads","Name","Company")', {
        row: { Name: "Amit" },
        tables: {
          Leads: [{ _row: 2, cells: { Name: "Amit", Company: "Bafna Steels" } }],
        },
      }),
    ).toBe("Bafna Steels");
  });
});

describe("suggestAppSheetFormula", () => {
  it("builds a concatenate formula from a prompt", () => {
    expect(suggestAppSheetFormula("combine name and company", ["Name", "Company"])).toBe(
      'CONCATENATE([Name]," — ",[Company])',
    );
  });
});
