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

  it("builds Cashbook as CFLO from a cash + expense prompt", () => {
    const plan = planFromPrompt(
      "Build a production Cash + Expense app. Brand: CFLO. Currency",
    );
    expect(plan.id).toBe("cashbook");
    expect(plan.config.meta.name).toBe("CFLO");
  });

  it("rebuilds sales + purchase + leads into one app", () => {
    const plan = planFromPrompt(
      "एक एप्लिकेशन बनाओ जिसमें सेल्स हो परचेज ऑर्डर हो और लीड्स आते हैं",
    );
    expect(Object.keys(plan.workbook.tabs)).toEqual(
      expect.arrayContaining(["Orders", "Leads"]),
    );
    expect(plan.config.views.some((view) => view.id === "leads")).toBe(true);
  });
});
