import { describe, expect, it } from "vitest";
import {
  addonInvoiceAmountPaise,
  addonMonthlyEquivalentPaise,
  resolveAddonBilling,
} from "@/lib/billing/org-addon-billing";
import { rupeesToPaise } from "@/lib/billing/money";

describe("org addon billing", () => {
  it("uses override rate and period when present", () => {
    const resolved = resolveAddonBilling(
      "CRM",
      rupeesToPaise(2999),
      [{ module: "CRM", ratePaise: rupeesToPaise(1999), billingPeriod: "ANNUAL" }],
      "MONTHLY",
    );
    expect(resolved.ratePaise).toBe(rupeesToPaise(1999));
    expect(resolved.billingPeriod).toBe("ANNUAL");
  });

  it("converts annual add-on to monthly equivalent for monthly org billing", () => {
    const monthly = addonMonthlyEquivalentPaise({
      ratePaise: rupeesToPaise(12_000),
      billingPeriod: "ANNUAL",
    });
    expect(monthly).toBe(rupeesToPaise(1000));
  });

  it("bills annual add-on in full when org bills annually", () => {
    const amount = addonInvoiceAmountPaise(
      { ratePaise: rupeesToPaise(12_000), billingPeriod: "ANNUAL" },
      "ANNUAL",
    );
    expect(amount).toBe(rupeesToPaise(12_000));
  });

  it("prorates monthly add-on onto annual org invoice", () => {
    const amount = addonInvoiceAmountPaise(
      { ratePaise: rupeesToPaise(1000), billingPeriod: "MONTHLY" },
      "ANNUAL",
    );
    expect(amount).toBe(rupeesToPaise(12_000));
  });
});
