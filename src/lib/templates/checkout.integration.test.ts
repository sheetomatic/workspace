import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomBytes } from "node:crypto";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  createCartCheckout,
  hash,
  ownedCheckout,
  publicCheckout,
  recordCapturedPayment,
  emailPaidCheckout,
  refreshCheckoutPayment,
} from "./checkout";
import { razorpayRequest } from "./gateway";
import { templateInvoiceHtml } from "./invoice";
import { sendPlainEmail } from "@/lib/integrations/email";
import {
  GET as statusRoute,
  POST as verifyRoute,
} from "@/app/api/templates/checkout/[id]/route";
import { GET as invoiceRoute } from "@/app/api/templates/checkout/[id]/invoice/route";
import { POST as webhookRoute } from "@/app/api/templates/webhook/route";

vi.mock("@/lib/platform", () => ({
  getPrimaryOrganization: async () => ({
    id: "template-integration-org",
    name: "Sheetomatic Test",
    isPrimary: true,
  }),
}));
vi.mock("@/lib/integrations/email", () => ({
  sendPlainEmail: vi.fn(async () => ({ sent: true })),
}));
vi.mock("./gateway", async (original) => ({
  ...(await original<typeof import("./gateway")>()),
  razorpayRequest: vi.fn(),
}));

// Never run a mutating integration test against a configured customer database.
const local =
  process.env.DATABASE_URL ===
  "postgresql://postgres@127.0.0.1:55439/template_checkout_test";
const buyer = {
  name: "Test Buyer",
  email: "checkout@example.test",
  phone: "9999999999",
  billedTo: "",
  address: "1 Test Road",
  city: "Raipur",
  pin: "492001",
  stateCode: "22",
  gstin: "",
};
const run = randomBytes(5).toString("hex");
const productId = `integration-${run}`;
const missingId = `missing-${run}`;
const body = {
  productIds: [productId],
  buyer,
  acceptedTerms: true,
  totalPaise: 1,
};
let externalNumber = 0;

describe.skipIf(!local)("real local PostgreSQL checkout", () => {
  beforeAll(async () => {
    vi.stubEnv("TEMPLATE_CHECKOUT_ENABLED", "true");
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_fixture");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "test-secret");
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "webhook-test-secret");
    await prisma.templateProduct.create({
      data: {
        id: productId,
        slug: productId,
        name: "Test app",
        type: "APPSHEET",
        priceInr: 9999,
        copyLink: "https://example.test/paid-copy",
      },
    });
    await prisma.templateProduct.create({
      data: {
        id: missingId,
        slug: missingId,
        name: "Not ready",
        type: "APPSHEET",
        priceInr: 9999,
      },
    });
  });
  beforeEach(async () => {
    await prisma.templateProduct.update({
      where: { id: productId },
      data: { name: "Test app", priceInr: 9999, active: true },
    });
    vi.mocked(sendPlainEmail).mockReset().mockResolvedValue({ sent: true });
    vi.mocked(razorpayRequest).mockReset();
    vi.mocked(razorpayRequest).mockImplementation(async (path, payload) => {
      if (path === "orders")
        return {
          id: `order_${run}${++externalNumber}`,
          amount: (payload as { amount: number }).amount,
          currency: "INR",
        };
      throw new Error("Unexpected gateway call");
    });
  });
  afterAll(async () => {
    await prisma.templateProduct.updateMany({
      where: { id: { in: [productId, missingId] } },
      data: { active: false },
    });
    vi.unstubAllEnvs();
    await prisma.$disconnect();
  });
  const start = () =>
    createCartCheckout(body, hash(randomBytes(32).toString("hex")));
  it("calculates server prices, stores snapshot, reuses idempotent checkout", async () => {
    const access = hash(randomBytes(32).toString("hex"));
    const order = await createCartCheckout(body, access);
    expect(order.totalPaise).toBe(117764);
    expect((await createCartCheckout(body, access)).id).toBe(order.id);
    expect(razorpayRequest).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(publicCheckout(order))).not.toContain("paid-copy");
    await expect(
      createCartCheckout(
        { ...body, buyer: { ...buyer, name: "Different" } },
        access,
      ),
    ).rejects.toThrow("different cart");
    await expect(ownedCheckout(order.id, "wrong-access")).rejects.toThrow();
    expect(() => templateInvoiceHtml(order)).toThrow();
  });
  it("blocks unavailable products, absent terms and unconfigured gateway", async () => {
    await expect(
      createCartCheckout({ ...body, productIds: [missingId] }, hash("missing")),
    ).rejects.toThrow("unavailable");
    await expect(
      createCartCheckout({ ...body, acceptedTerms: false }, hash("no-consent")),
    ).rejects.toThrow("terms");
    vi.stubEnv("TEMPLATE_CHECKOUT_ENABLED", "false");
    await expect(start()).rejects.toThrow("configured");
    vi.stubEnv("TEMPLATE_CHECKOUT_ENABLED", "true");
    expect(razorpayRequest).not.toHaveBeenCalled();
  });
  it("rejects wrong amount and authorized-only payment without issuing invoice", async () => {
    const order = await start();
    const p = {
      id: `pay_${run}bad`,
      order_id: order.gatewayOrderId!,
      amount: 1,
      currency: "INR",
      status: "captured",
      captured: true,
      amount_refunded: 0,
    };
    vi.mocked(razorpayRequest).mockResolvedValue(p);
    await expect(recordCapturedPayment(order.id, p.id)).rejects.toThrow();
    vi.mocked(razorpayRequest).mockResolvedValue({
      ...p,
      amount: order.totalPaise,
      status: "authorized",
      captured: false,
    });
    await expect(recordCapturedPayment(order.id, p.id)).rejects.toThrow();
    expect(
      (
        await prisma.templateCheckout.findUniqueOrThrow({
          where: { id: order.id },
        })
      ).invoiceNumber,
    ).toBeNull();
  });
  it("allocates exactly one invoice under concurrent callback and webhook replay", async () => {
    const order = await start();
    const p = {
      id: `pay_${run}good`,
      order_id: order.gatewayOrderId!,
      amount: order.totalPaise,
      currency: "INR",
      status: "captured",
      captured: true,
      amount_refunded: 0,
    };
    vi.mocked(razorpayRequest).mockResolvedValue(p);
    const results = await Promise.all([
      recordCapturedPayment(order.id, p.id),
      recordCapturedPayment(order.id, p.id),
      recordCapturedPayment(order.id, p.id),
    ]);
    expect(new Set(results.map((r) => r.invoiceNumber)).size).toBe(1);
    expect(results[0].invoiceNumber).toMatch(/^ST\d{4}\/\d{8}$/);
    expect(publicCheckout(results[0]).lines[0].copyLink).toBe(
      "https://example.test/paid-copy",
    );
    await expect(
      recordCapturedPayment(order.id, `pay_${run}other`),
    ).rejects.toThrow();
    await emailPaidCheckout(order.id);
    expect(sendPlainEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: buyer.email,
        attachments: [expect.objectContaining({ contentType: "text/html" })],
      }),
    );
    const before = vi.mocked(sendPlainEmail).mock.calls.length;
    await emailPaidCheckout(order.id);
    expect(sendPlainEmail).toHaveBeenCalledTimes(before);
    await prisma.templateProduct.update({
      where: { id: productId },
      data: { name: "Changed after payment", priceInr: 100 },
    });
    expect(templateInvoiceHtml(results[0])).toContain("Test app");
    expect(templateInvoiceHtml(results[0])).not.toContain(
      "Changed after payment",
    );
  });
  it("retains a recoverable order after gateway timeout and does not blindly recreate it", async () => {
    const access = hash(randomBytes(32).toString("hex"));
    vi.mocked(razorpayRequest).mockRejectedValue(new Error("timeout"));
    const first = await createCartCheckout(body, access);
    expect(first.paymentState).toBe("creating");
    expect(first.gatewayOrderId).toBeNull();
    expect((await createCartCheckout(body, access)).id).toBe(first.id);
    expect(razorpayRequest).toHaveBeenCalledTimes(1);
  });
  it("HTTP routes reject unauthorised invoice access and forged browser success", async () => {
    const token = randomBytes(32).toString("hex");
    const order = await createCartCheckout(body, hash(token));
    const context = { params: Promise.resolve({ id: order.id }) };
    const url = `http://localhost/api/templates/checkout/${order.id}`;
    expect((await statusRoute(new Request(url), context)).status).toBe(404);
    expect(
      (
        await invoiceRoute(
          new Request(`${url}/invoice`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          context,
        )
      ).status,
    ).toBe(404);
    const forged = new Request(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: order.gatewayOrderId,
        razorpay_payment_id: "pay_forged",
        razorpay_signature: "a".repeat(64),
      }),
    });
    expect((await verifyRoute(forged, context)).status).toBe(409);
    expect(
      (
        await prisma.templateCheckout.findUniqueOrThrow({
          where: { id: order.id },
        })
      ).paidAt,
    ).toBeNull();
  });
  it("webhooks reject bad signatures, verify captured payment and safely replay", async () => {
    const order = await start();
    const p = {
      id: `pay_${run}webhook`,
      order_id: order.gatewayOrderId!,
      amount: order.totalPaise,
      currency: "INR",
      status: "captured",
      captured: true,
      amount_refunded: 0,
    };
    vi.mocked(razorpayRequest).mockResolvedValue(p);
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: p } },
    });
    const signature = createHmac("sha256", "webhook-test-secret")
      .update(body)
      .digest("hex");
    const req = (sig: string) =>
      new Request("http://localhost/api/templates/webhook", {
        method: "POST",
        headers: { "x-razorpay-signature": sig },
        body,
      });
    expect((await webhookRoute(req("invalid"))).status).toBe(401);
    expect((await webhookRoute(req(signature))).status).toBe(200);
    const first = await prisma.templateCheckout.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(first.invoiceNumber).not.toBeNull();
    expect((await webhookRoute(req(signature))).status).toBe(200);
    expect(
      (
        await prisma.templateCheckout.findUniqueOrThrow({
          where: { id: order.id },
        })
      ).invoiceNumber,
    ).toBe(first.invoiceNumber);
  });
  it("reconciles pending and failed attempts server-side without trusting browser status", async () => {
    const order = await start();
    const payment = {
      id: `pay_${run}reconciled`,
      order_id: order.gatewayOrderId!,
      amount: order.totalPaise,
      currency: "INR",
      status: "authorized",
      captured: false,
      amount_refunded: 0,
    };
    vi.mocked(razorpayRequest).mockResolvedValue({ items: [payment] });
    const pending = await refreshCheckoutPayment(order);
    expect(pending.paymentState).toBe("pending");
    expect(publicCheckout(pending).lines[0].copyLink).toBeUndefined();
    vi.mocked(razorpayRequest).mockResolvedValue({
      items: [{ ...payment, status: "failed" }],
    });
    const failed = await refreshCheckoutPayment(pending);
    expect(failed.paymentState).toBe("failed");
    expect(failed.paidAt).toBeNull();
    expect(failed.invoiceNumber).toBeNull();
    vi.mocked(razorpayRequest).mockImplementation(async (path) =>
      path.endsWith("/payments")
        ? { items: [{ ...payment, captured: true, status: "captured" }] }
        : { ...payment, captured: true, status: "captured" },
    );
    const paid = await refreshCheckoutPayment(pending);
    expect(paid.paidAt).not.toBeNull();
    expect(paid.invoiceNumber).not.toBeNull();
    expect(paid.totalPaise).toBe(order.totalPaise);
  });
  it("requires a valid checkout signature AND matching captured provider payment", async () => {
    const token = randomBytes(32).toString("hex");
    const order = await createCartCheckout(body, hash(token));
    const paymentId = `pay_${run}signature`;
    const signature = createHmac("sha256", "test-secret")
      .update(`${order.gatewayOrderId}|${paymentId}`)
      .digest("hex");
    const req = () =>
      new Request(`http://localhost/api/templates/checkout/${order.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          razorpay_order_id: order.gatewayOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          amount: 1,
          paid: true,
        }),
      });
    const context = { params: Promise.resolve({ id: order.id }) };
    const payment = {
      id: paymentId,
      order_id: order.gatewayOrderId!,
      amount: 1,
      currency: "INR",
      status: "captured",
      captured: true,
      amount_refunded: 0,
    };
    vi.mocked(razorpayRequest).mockResolvedValue(payment);
    expect((await verifyRoute(req(), context)).status).toBe(409);
    expect((await ownedCheckout(order.id, hash(token))).paidAt).toBeNull();
    vi.mocked(razorpayRequest).mockResolvedValue({
      ...payment,
      amount: order.totalPaise,
    });
    const accepted = await verifyRoute(req(), context);
    expect(accepted.status).toBe(200);
    expect((await accepted.json()).paid).toBe(true);
  });
  it("serializes concurrent fulfilment and retries with the same email idempotency key", async () => {
    const order = await start();
    const payment = {
      id: `pay_${run}email`,
      order_id: order.gatewayOrderId!,
      amount: order.totalPaise,
      currency: "INR",
      status: "captured",
      captured: true,
      amount_refunded: 0,
    };
    vi.mocked(razorpayRequest).mockResolvedValue(payment);
    await recordCapturedPayment(order.id, payment.id);
    let release!: () => void;
    vi.mocked(sendPlainEmail).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { sent: false, reason: "api_error" };
    });
    const first = emailPaidCheckout(order.id);
    // Attach rejection handling immediately; the failed attempt is expected.
    const failure = expect(first).rejects.toThrow("pending");
    await vi.waitFor(() => expect(sendPlainEmail).toHaveBeenCalledTimes(1));
    await expect(emailPaidCheckout(order.id)).rejects.toThrow(
      "already processing",
    );
    release();
    await failure;
    const pending = await prisma.templateCheckout.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(pending.emailLeaseUntil).toBeNull();
    expect(pending.emailSentAt).toBeNull();
    expect(publicCheckout(pending).lines[0].copyLink).toContain("paid-copy");
    await emailPaidCheckout(order.id);
    expect(sendPlainEmail).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(sendPlainEmail).mock.calls;
    expect(calls[0][0].idempotencyKey).toBe(`template-invoice/${order.id}`);
    expect(calls[1][0].idempotencyKey).toBe(calls[0][0].idempotencyKey);
    await emailPaidCheckout(order.id);
    expect(sendPlainEmail).toHaveBeenCalledTimes(2);
  });
  it("does not automatically resend an uncertain email after the provider deduplication window", async () => {
    const order = await start();
    await prisma.templateCheckout.update({
      where: { id: order.id },
      data: {
        paidAt: new Date(),
        invoiceNumber: `TEST-${run}`,
        emailAttemptedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });
    await expect(emailPaidCheckout(order.id)).rejects.toThrow("reconciliation");
    expect(sendPlainEmail).not.toHaveBeenCalled();
  });
});
