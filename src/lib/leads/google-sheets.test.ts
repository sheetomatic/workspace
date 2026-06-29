import { describe, expect, it } from "vitest";
import { parseLeadsSheetRows } from "@/lib/leads/google-sheets";
import { parseLeadsPeriodParams } from "@/lib/leads/period";
import {
  buildGoogleSheetsLeadConfigFromInput,
  DEFAULT_LEADS_SPREADSHEET_GID,
  DEFAULT_LEADS_SPREADSHEET_ID,
} from "@/lib/leads/sheet-config";

describe("parseLeadsSheetRows", () => {
  it("maps common lead columns from a header row", () => {
    const rows = [
      ["Date", "Name", "Phone", "Requirement", "Source", "Status"],
      ["15/03/2026", "Ravi Kumar", "919876543210", "FMS setup", "Google Ads", "NEW"],
      ["", "", "", "", "", ""],
    ];

    const parsed = parseLeadsSheetRows(rows, { headerRow: 1 });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.name).toBe("Ravi Kumar");
    expect(parsed[0]?.phone).toBe("919876543210");
    expect(parsed[0]?.sourceDetail).toBe("Google Ads");
    expect(parsed[0]?.status).toBe("NEW");
    expect(parsed[0]?.capturedAt).toBeInstanceOf(Date);
  });

  it("maps Google Form response columns", () => {
    const rows = [
      [
        "Timestamp",
        "Full Name",
        "Contact Number",
        "Email Address",
        "Company",
        "Requirement Description",
        "Are you Business Owner or Staff?",
      ],
      [
        "29/03/2026 10:15:00",
        "Ravi Kumar",
        "919876543210",
        "ravi@example.com",
        "Acme Pvt Ltd",
        "Need FMS for manufacturing",
        "Business Owner",
      ],
    ];

    const parsed = parseLeadsSheetRows(rows);
    expect(parsed[0]?.name).toBe("Ravi Kumar");
    expect(parsed[0]?.email).toBe("ravi@example.com");
    expect(parsed[0]?.sourceDetail).toContain("Acme Pvt Ltd");
    expect(parsed[0]?.sourceDetail).toContain("Business Owner");
  });

  it("generates stable external ids from timestamp and phone", () => {
    const rows = [
      ["Timestamp", "Full Name", "Contact Number"],
      ["29/03/2026 10:15:00", "Asha", "919900001111"],
    ];
    const parsed = parseLeadsSheetRows(rows);
    expect(parsed[0]?.externalId).toBe("sheet-29/03/2026-10:15:00-919900001111");
  });

  it("falls back to row number when no stable key exists", () => {
    const rows = [
      ["Name", "Phone"],
      ["Asha", "919900001111"],
    ];
    const parsed = parseLeadsSheetRows(rows);
    expect(parsed[0]?.externalId).toBe("sheet-row-2");
  });
});

describe("parseLeadsPeriodParams", () => {
  it("defaults to all-time period", () => {
    const period = parseLeadsPeriodParams({});
    expect(period.type).toBe("all");
    expect(period.periodLabel).toBe("All time");
  });

  it("parses quarterly period", () => {
    const period = parseLeadsPeriodParams({ period: "quarterly", quarter: "2026-Q2" });
    expect(period.type).toBe("quarterly");
    expect(period.quarter).toBe("2026-Q2");
    expect(period.start.getMonth()).toBe(3);
  });
});

describe("sheet config", () => {
  it("ships the shared intake spreadsheet id", () => {
    expect(DEFAULT_LEADS_SPREADSHEET_ID).toBe(
      "1uXA3TsZrT9uZNR3fiooNzBKFRYGrxt_1ydJdyJEt11Y",
    );
  });

  it("extracts gid from spreadsheet url", () => {
    const config = buildGoogleSheetsLeadConfigFromInput({
      spreadsheetUrl:
        "https://docs.google.com/spreadsheets/d/1uXA3TsZrT9uZNR3fiooNzBKFRYGrxt_1ydJdyJEt11Y/edit?gid=1019902152",
      sheetTab: "Form Responses 1",
      headerRow: 1,
    });
    expect(config.gid).toBe(DEFAULT_LEADS_SPREADSHEET_GID);
  });
});
