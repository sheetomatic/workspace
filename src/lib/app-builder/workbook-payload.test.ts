import { describe, expect, it } from "vitest";
import { workbookFromClient } from "./workbook-payload";

describe("workbookFromClient", () => {
  it("accepts a seed workbook so a new Sheet can be created without an upload", () => {
    const book = workbookFromClient({
      title: "Cashbook · Sheetomatic",
      tabs: {
        Credits: {
          headers: ["Date", "From", "Amount"],
          rows: [{ cells: { Date: "01/08/2026", From: "SM Traders", Amount: 1000 } }],
        },
      },
    });
    expect(book?.title).toBe("Cashbook · Sheetomatic");
    expect(book?.tabs.Credits.rows[0].cells.Amount).toBe(1000);
  });

  it("rejects an empty payload", () => {
    expect(workbookFromClient({})).toBeNull();
    expect(workbookFromClient({ title: "X", tabs: {} })).toBeNull();
  });
});
