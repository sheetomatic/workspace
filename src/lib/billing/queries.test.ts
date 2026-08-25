import { describe, expect, it } from "vitest";
import { summarizeClientBilling, type ClientBillingRow } from "@/lib/billing/queries";

function row(overrides: Partial<ClientBillingRow>): ClientBillingRow {
  return {
    id: "1",
    name: "Acme",
    slug: "acme",
    status: "ACTIVE",
    plan: "BCI_STARTER",
    product: "BCI",
    productLabel: "BCI",
    planLabel: "BCI FMS Starter",
    planStatus: "ACTIVE",
    activeUsers: 4,
    maxMembers: 8,
    monthlyLabel: "₹4,999",
    monthlyPaise: 499900,
    renewalAt: null,
    renewalLabel: "—",
    ownerName: null,
    ownerEmail: null,
    latestInvoice: null,
    invoicedPaise: 0,
    receivedPaise: 0,
    pendingPaise: 0,
    pendingInvoices: 0,
    invoicedLabel: "₹0",
    receivedLabel: "₹0",
    pendingLabel: "₹0",
    onboarding: { done: 0, total: 0, percent: 0 },
    ...overrides,
  };
}

describe("summarizeClientBilling", () => {
  it("rolls up clients, users, invoiced, pending, and received", () => {
    const totals = summarizeClientBilling([
      row({
        activeUsers: 4,
        invoicedPaise: 10_000,
        pendingPaise: 4_000,
        receivedPaise: 6_000,
        pendingInvoices: 1,
      }),
      row({
        id: "2",
        status: "HOLD",
        planStatus: "PAST_DUE",
        activeUsers: 2,
        invoicedPaise: 5_000,
        pendingPaise: 5_000,
        receivedPaise: 0,
        pendingInvoices: 1,
      }),
    ]);
    expect(totals.clients).toBe(2);
    expect(totals.activeUsers).toBe(6);
    expect(totals.invoicedPaise).toBe(15_000);
    expect(totals.pendingPaise).toBe(9_000);
    expect(totals.receivedPaise).toBe(6_000);
    expect(totals.pendingInvoices).toBe(2);
    expect(totals.onHold).toBe(1);
  });
});
