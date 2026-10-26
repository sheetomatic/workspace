import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ find: vi.fn(), record: vi.fn(), email: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { templateCheckout: { findUnique: mocks.find } } }));
vi.mock("@/lib/templates/checkout", () => ({ recordCapturedPayment: mocks.record, emailPaidCheckout: mocks.email }));
import { POST } from "./route";
const secret = "isolated-webhook-fixture-not-a-real-secret";
const event = { event: "payment.captured", payload: { payment: { entity: { id: "pay_fixture", order_id: "order_fixture" } } } };
function request(value: unknown, signature?: string) {
  const raw = JSON.stringify(value);
  return new Request("https://sheetomatic.com/api/templates/webhook", { method: "POST", body: raw, headers: {
    "x-razorpay-signature": signature ?? createHmac("sha256", secret).update(raw).digest("hex"),
  } });
}
beforeEach(() => { vi.resetAllMocks();vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", secret);mocks.find.mockResolvedValue({ id: "fixture" }); });
describe("Razorpay webhook (isolated, no network)", () => {
  it("rejects tampering before lookup or fulfillment", async () => {
    expect((await POST(request(event, "0".repeat(64)))).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();expect(mocks.record).not.toHaveBeenCalled();expect(mocks.email).not.toHaveBeenCalled();
  });
  it.each(["payment.captured", "order.paid"])("verifies %s before delivery", async kind => {
    const response = await POST(request({ ...event, event: kind }));
    expect(response.status).toBe(200);
    expect(mocks.record).toHaveBeenCalledWith("fixture", "pay_fixture");
    expect(mocks.record.mock.invocationCallOrder[0]).toBeLessThan(mocks.email.mock.invocationCallOrder[0]);
  });
  it("does not fulfill failed payments or unrelated events", async () => {
    expect((await POST(request({ ...event, event: "payment.failed" }))).status).toBe(200);
    expect(mocks.find).not.toHaveBeenCalled();expect(mocks.email).not.toHaveBeenCalled();
  });
  it("does not touch another merchant product", async () => {
    mocks.find.mockResolvedValue(null);
    expect((await POST(request(event))).status).toBe(200);expect(mocks.record).not.toHaveBeenCalled();
  });
  it("returns retryable failure and never sends an invoice when verification fails", async () => {
    mocks.record.mockRejectedValue(new Error("Capture not verified"));
    expect((await POST(request(event))).status).toBe(503);expect(mocks.email).not.toHaveBeenCalled();
  });
  it("returns retryable failure if invoice delivery fails", async () => {
    mocks.email.mockRejectedValue(new Error("Provider unavailable"));
    expect((await POST(request(event))).status).toBe(503);
  });
  it("rejects missing payment references", async () => {
    expect((await POST(request({ event: "order.paid", payload: {} }))).status).toBe(400);
    expect(mocks.record).not.toHaveBeenCalled();
  });
});
