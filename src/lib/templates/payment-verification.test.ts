import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(), claim: vi.fn(), invoice: vi.fn(), counter: vi.fn(), payment: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: {
  templateCheckout: { findUniqueOrThrow: mocks.find },
  $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
    templateCheckout: { updateMany: mocks.claim, update: mocks.invoice, findUniqueOrThrow: mocks.find },
    templateInvoiceCounter: { upsert: mocks.counter },
  }),
} }));
vi.mock("./gateway", async importOriginal => ({
  ...await importOriginal<typeof import("./gateway")>(), razorpayRequest: mocks.payment,
}));
import { recordCapturedPayment } from "./checkout";

const unpaid = { id: "fixture", gatewayOrderId: "order_fixture", totalPaise: 283200, paidAt: null, gatewayPaymentId: null, invoiceNumber: null };
const payment = { id: "pay_fixture", order_id: "order_fixture", amount: 283200, currency: "INR", status: "captured", captured: true, amount_refunded: 0 };
const paid = { ...unpaid, paidAt: new Date("2026-10-25T00:00:00Z"), gatewayPaymentId: "pay_fixture", invoiceNumber: "ST2627/00000001" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.find.mockResolvedValueOnce(unpaid).mockResolvedValue(paid);
  mocks.payment.mockResolvedValue(payment);
  mocks.claim.mockResolvedValue({ count: 1 });
  mocks.counter.mockResolvedValue({ value: 1 });
});

describe("verified checkout payment boundary (mock provider; no charges)", () => {
  it("records a captured matching payment and allocates one invoice", async () => {
    expect(await recordCapturedPayment("fixture", "pay_fixture")).toEqual(paid);
    expect(mocks.payment).toHaveBeenCalledWith("payments/pay_fixture");
    expect(mocks.counter).toHaveBeenCalledTimes(1);
    expect(mocks.invoice).toHaveBeenCalledTimes(1);
  });
  it.each([
    { captured: false }, { status: "authorized" }, { status: "failed" },
    { amount: 1 }, { currency: "USD" }, { order_id: "order_other" },
    { amount_refunded: 1 }, { id: "pay_other" },
  ])("does not mark paid or create an invoice for %j", async patch => {
    mocks.payment.mockResolvedValue({ ...payment, ...patch });
    await expect(recordCapturedPayment("fixture", "pay_fixture")).rejects.toThrow();
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(mocks.counter).not.toHaveBeenCalled();
    expect(mocks.invoice).not.toHaveBeenCalled();
  });
  it("does not mutate on provider failure", async () => {
    mocks.payment.mockRejectedValue(new Error("Provider unavailable"));
    await expect(recordCapturedPayment("fixture", "pay_fixture")).rejects.toThrow();
    expect(mocks.claim).not.toHaveBeenCalled();
  });
  it("acknowledges a repeat callback without allocating another invoice", async () => {
    mocks.find.mockReset().mockResolvedValue(paid);
    expect(await recordCapturedPayment("fixture", "pay_fixture")).toEqual(paid);
    expect(mocks.payment).not.toHaveBeenCalled();
    expect(mocks.counter).not.toHaveBeenCalled();
  });
  it("rejects a different payment for an already-paid order", async () => {
    mocks.find.mockReset().mockResolvedValue(paid);
    await expect(recordCapturedPayment("fixture", "pay_other")).rejects.toThrow("does not match");
    expect(mocks.counter).not.toHaveBeenCalled();
  });
  it("does not allocate again when a concurrent callback already won", async () => {
    mocks.claim.mockResolvedValue({ count: 0 });
    expect(await recordCapturedPayment("fixture", "pay_fixture")).toEqual(paid);
    expect(mocks.counter).not.toHaveBeenCalled();
    expect(mocks.invoice).not.toHaveBeenCalled();
  });
  it("rejects a different payment that loses the concurrent update", async () => {
    mocks.claim.mockResolvedValue({ count: 0 });
    mocks.find.mockReset().mockResolvedValueOnce(unpaid).mockResolvedValue({ ...paid, gatewayPaymentId: "pay_winner" });
    await expect(recordCapturedPayment("fixture", "pay_fixture")).rejects.toThrow("does not match");
    expect(mocks.counter).not.toHaveBeenCalled();
  });
  it("rejects malformed payment identifiers before provider access", async () => {
    await expect(recordCapturedPayment("fixture", "../payments")).rejects.toThrow();
    expect(mocks.payment).not.toHaveBeenCalled();
  });
});
