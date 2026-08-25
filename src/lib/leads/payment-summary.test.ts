import { describe, expect, it } from "vitest";
import {
  computeLeadPaymentSummary,
  leadOutstandingBalance,
} from "@/lib/leads/payment-summary";

describe("leadOutstandingBalance", () => {
  it("treats an adjustment as settling the remaining invoice", () => {
    expect(
      leadOutstandingBalance({
        invoiceTotal: 10_000,
        payments: [
          { receivedAmount: 8_000, paymentType: "PARTIAL" },
          { receivedAmount: 2_000, paymentType: "ADJUSTMENT" },
        ],
      }),
    ).toBe(0);
  });

  it("keeps a reminder balance when only cash is short", () => {
    expect(
      leadOutstandingBalance({
        invoiceTotal: 10_000,
        payments: [{ receivedAmount: 8_000, paymentType: "PARTIAL" }],
      }),
    ).toBe(2_000);
  });
});

describe("computeLeadPaymentSummary", () => {
  it("shows cash received, adjusted, and zero due after a short settlement", () => {
    const summary = computeLeadPaymentSummary({
      quotations: [{ totalAmount: 10_000 }],
      payments: [
        {
          receivedAmount: 8_500,
          receivedDate: "2026-08-20",
          paymentType: "PARTIAL",
        },
        {
          receivedAmount: 1_500,
          receivedDate: "2026-08-25",
          paymentType: "ADJUSTMENT",
        },
      ],
    });
    expect(summary.received).toBe(8_500);
    expect(summary.adjusted).toBe(1_500);
    expect(summary.due).toBe(0);
  });
});
