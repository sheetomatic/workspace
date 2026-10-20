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
import {
  claimHostedPayment,
  confirmHostedPayment,
  listHostedTemplateOrders,
} from "./hosted-checkout";
import { getSessionUser } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn(async () => null) }));

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
  beforeEach(() => {
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_fixture");
    vi.mocked(getSessionUser).mockResolvedValue(null);
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
    await expect(createCartCheckout(body, access)).rejects.toThrow("timeout");
    await expect(createCartCheckout(body, access)).rejects.toThrow("pending");
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
  it("hosted checkout reuses orders without API keys and keeps claimed payments locked", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "");
    const token = randomBytes(32).toString("hex");
    const order = await createCartCheckout(body, hash(token));
    expect(order.paymentMode).toBe("hosted_manual");
    expect(order.gatewayOrderId).toBeNull();
    expect(razorpayRequest).not.toHaveBeenCalled();
    expect((await createCartCheckout(body, hash(token))).id).toBe(order.id);
    await expect(
      claimHostedPayment(order.id, hash("other"), "pay_fixture123"),
    ).rejects.toThrow();
    await expect(
      claimHostedPayment(order.id, hash(token), "fake"),
    ).rejects.toThrow();
    const ref = `pay_${run}manual`;
    const response = await verifyRoute(
      new Request(`http://localhost/api/templates/checkout/${order.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentReference: ref,
          paid: true,
          totalPaise: 1,
        }),
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    expect(response.status).toBe(200);
    const pending = await response.json();
    expect(pending.paymentClaimed).toBe(true);
    expect(pending.paid).toBe(false);
    expect(pending.lines[0].copyLink).toBeUndefined();
    expect(pending.invoiceNumber).toBeNull();
    const emails = vi.mocked(sendPlainEmail).mock.calls.length;
    await claimHostedPayment(order.id, hash(token), ref);
    expect(sendPlainEmail).toHaveBeenCalledTimes(emails);
    await expect(
      claimHostedPayment(order.id, hash(token), `pay_${run}changed`),
    ).rejects.toThrow("already");
    expect(
      (
        await invoiceRoute(
          new Request(
            `http://localhost/api/templates/checkout/${order.id}/invoice`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
          { params: Promise.resolve({ id: order.id }) },
        )
      ).status,
    ).toBe(404);
  });
  it("requires super-admin verification, matching total/reference, then issues one invoice", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "");
    const access = hash(randomBytes(32).toString("hex"));
    const order = await createCartCheckout(body, access);
    const reference = `pay_${run}admin`;
    await claimHostedPayment(order.id, access, reference);
    const input = {
      id: order.id,
      reference,
      amountInr: (order.totalPaise / 100).toFixed(2),
      verified: true,
    };
    await expect(confirmHostedPayment(input)).rejects.toThrow("super admins");
    await expect(listHostedTemplateOrders()).rejects.toThrow("authorised");
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "test-admin",
      isSuperAdmin: true,
    } as Awaited<ReturnType<typeof getSessionUser>>);
    await expect(
      confirmHostedPayment({ ...input, verified: false }),
    ).rejects.toThrow("Verify");
    await expect(
      confirmHostedPayment({ ...input, amountInr: "0.01" }),
    ).rejects.toThrow("Verify");
    await expect(
      confirmHostedPayment({ ...input, reference: `pay_${run}wrong` }),
    ).rejects.toThrow("Verify");
    const paid = await Promise.all([
      confirmHostedPayment(input),
      confirmHostedPayment(input),
    ]);
    expect(paid[0].invoiceNumber).toBe(paid[1].invoiceNumber);
    expect(paid[0].confirmedById).toBe("test-admin");
    expect(publicCheckout(paid[0]).lines[0].copyLink).toContain("paid-copy");
    expect(templateInvoiceHtml(paid[0])).toContain(paid[0].invoiceNumber!);
    const otherAccess = hash(randomBytes(32).toString("hex"));
    const other = await createCartCheckout(body, otherAccess);
    await claimHostedPayment(other.id, otherAccess, reference);
    await expect(
      confirmHostedPayment({ ...input, id: other.id }),
    ).rejects.toThrow();
    expect((await ownedCheckout(other.id, otherAccess)).paidAt).toBeNull();
    await prisma.templateCheckout.update({
      where: { id: other.id },
      data: { organizationId: "different-workspace" },
    });
    await expect(
      confirmHostedPayment({ ...input, id: other.id }),
    ).rejects.toThrow();
  });
});
