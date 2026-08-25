import { describe, expect, it } from "vitest";
import { addUtcMonths, daysBetweenUtc, isPastDueDate, monthlyPeriodFrom } from "@/lib/billing/dates";
import { applyGst, rupeesToPaise } from "@/lib/billing/money";
import { extraUsers, buildInvoiceQuote, prorataFraction } from "@/lib/billing/prorata";
import { shouldSendReminder } from "@/lib/billing/dates";

describe("subscription prorata", () => {
  it("counts extra users beyond included seats", () => {
    expect(extraUsers(12, 8)).toBe(4);
    expect(extraUsers(8, 8)).toBe(0);
    expect(extraUsers(3, 8)).toBe(0);
  });

  it("prorates remaining days in a 30-day period", () => {
    const periodStart = new Date("2026-08-01T00:00:00.000Z");
    const periodEnd = new Date("2026-08-30T00:00:00.000Z");
    expect(prorataFraction(periodStart, periodEnd, periodStart)).toBe(1);
    expect(prorataFraction(periodStart, periodEnd, new Date("2026-08-16T00:00:00.000Z"))).toBe(
      15 / 30,
    );
  });

  it("adds extra users, add-ons, and GST", () => {
    const quote = buildInvoiceQuote({
      monthlyRatePaise: rupeesToPaise(4999),
      extraUserMonthlyPaise: rupeesToPaise(599),
      includedUsers: 8,
      activeUsers: 10,
      extraAddonPaise: rupeesToPaise(2999),
      gstPercent: 18,
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-08-30T00:00:00.000Z"),
      prorate: false,
    });
    expect(quote.extraUsers).toBe(2);
    expect(quote.subtotalPaise).toBe(rupeesToPaise(4999));
    expect(quote.extraPaise).toBe(rupeesToPaise(599 * 2 + 2999));
    expect(quote.gstPaise).toBe(
      applyGst(rupeesToPaise(4999 + 599 * 2 + 2999), 18).gstPaise,
    );
    expect(quote.totalPaise).toBe(quote.subtotalPaise + quote.extraPaise + quote.gstPaise);
  });

  it("keeps access through the due date and holds the next day", () => {
    const due = new Date("2026-08-31T00:00:00.000Z");
    expect(isPastDueDate(due, new Date("2026-08-31T18:00:00.000Z"))).toBe(false);
    expect(isPastDueDate(due, new Date("2026-09-01T00:00:00.000Z"))).toBe(true);
  });

  it("builds a one-month period ending the day before the next anniversary", () => {
    const period = monthlyPeriodFrom(new Date("2026-01-31T00:00:00.000Z"));
    expect(period.periodEnd.toISOString().slice(0, 10)).toBe("2026-02-27");
    expect(addUtcMonths(new Date("2026-01-31T00:00:00.000Z"), 1).toISOString().slice(0, 10)).toBe(
      "2026-02-28",
    );
    expect(daysBetweenUtc(period.periodStart, period.periodEnd)).toBe(27);
  });

  it("sends reminders on 7/3/1/0 once per day", () => {
    const now = new Date("2026-08-24T04:00:00.000Z");
    expect(shouldSendReminder(7, null, now)).toBe(true);
    expect(shouldSendReminder(2, null, now)).toBe(false);
    expect(shouldSendReminder(7, now, now)).toBe(false);
  });
});
