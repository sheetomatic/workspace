import { describe, expect, it } from "vitest";
import { planFromPrompt } from "./planner";

describe("planFromPrompt", () => {
  it("builds Cashbook when the client asks for credits and debits", () => {
    const plan = planFromPrompt(
      "Cashbook where owner and accounts fill credits, debits, expenses by date and category",
    );
    expect(plan.id).toBe("cashbook");
    expect(Object.keys(plan.workbook.tabs)).toContain("Credits");
    expect(Object.keys(plan.workbook.tabs)).toContain("Expense categories");
  });

  it("still maps a plain expense request to Expenses", () => {
    expect(planFromPrompt("petrol diesel expense tracker").id).toBe("expenses");
  });
});
