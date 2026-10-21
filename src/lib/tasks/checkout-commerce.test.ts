import { describe, expect, it } from "vitest";
import { tasksCheckoutLines, tasksCheckoutTotals } from "./checkout-commerce";

describe("Tasks Management checkout pricing", () => {
  it.each([
    [1, 2400, 8],
    [7, 2400, 8],
    [8, 2400, 8],
    [9, 2700, 9],
  ])("bills %i monthly users at the 8-user minimum where needed", (users, priceInr, quantity) => {
    const [line] = tasksCheckoutLines({ period: "monthly", users, whatsappApi: false });
    expect(line.priceInr).toBe(priceInr);
    expect(line.quantity).toBe(quantity);
  });

  it("keeps annual pricing per selected user, without the monthly minimum", () => {
    expect(tasksCheckoutLines({ period: "yearly", users: 1, whatsappApi: false })).toEqual([
      { name: "Tasks Management — 1 user (1 year)", priceInr: 2500, quantity: 1 },
    ]);
  });

  it("calculates server totals from server prices and ignores a tampered client total", () => {
    const forgedInput = { period: "monthly" as const, users: 1, whatsappApi: false, totalPaise: 1 };
    const { period, users, whatsappApi } = forgedInput;
    const lines = tasksCheckoutLines({ period, users, whatsappApi });
    const totals = tasksCheckoutTotals(lines.map(line => line.priceInr), "27", "27");
    expect(totals.subtotalPaise).toBe(240000);
    expect(totals.gstPaise).toBe(43200);
    expect(totals.totalPaise).toBe(283200);
    const retry = { ...forgedInput, totalPaise: 1_000_000 };
    const retriedWithDifferentTamperedTotal = tasksCheckoutLines({ period: retry.period, users: retry.users, whatsappApi: retry.whatsappApi });
    expect(retriedWithDifferentTamperedTotal.map(line => line.priceInr)).toEqual(lines.map(line => line.priceInr));
  });

  it("includes the optional WhatsApp API add-on as a separate annual line", () => {
    expect(tasksCheckoutLines({ period: "monthly", users: 8, whatsappApi: true }).map(line => line.priceInr)).toEqual([2400, 10000]);
  });
});
