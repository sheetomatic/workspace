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

  it("reads USEREMAIL, USERNAME, and USERROLE like AppSheet", () => {
    expect(
      evaluateAppSheetFormula("USEREMAIL()", {
        row,
        userEmail: "asha@firm.com",
        userName: "Asha",
        userRole: "Staff",
      }),
    ).toBe("asha@firm.com");
    expect(
      evaluateAppSheetFormula("USERNAME()", {
        row,
        userEmail: "asha@firm.com",
        userName: "Asha",
        userRole: "Staff",
      }),
    ).toBe("Asha");
    expect(
      evaluateAppSheetFormula('IF(USERROLE()="Staff","Mine","All")', {
        row,
        userRole: "Staff",
      }),
    ).toBe("Mine");
    expect(
      evaluateAppSheetFormula('IN(USERROLE(),"Admin","Manager")', {
        row,
        userRole: "Manager",
      }),
    ).toBe(true);
    expect(
      evaluateAppSheetFormula('OR(USERROLE()="Admin",[Email]="x")', {
        row: { Email: "no" },
        userRole: "Admin",
      }),
    ).toBe(true);
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
