import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { activatePaidTasksCheckout } from "./paid-activation";
import { emailPaidCheckout } from "@/lib/templates/checkout";
const mail = vi.hoisted(() => vi.fn(async (message: { subject: string; text: string; idempotencyKey?: string }) => { if (!message.subject) throw new Error("Fixture requires subject"); return { sent: true as const }; }));
vi.mock("@/lib/integrations/email", () => ({ sendPlainEmail: mail }));
const safe = process.env.DATABASE_URL === "postgresql://analytics_test:analytics_local_test@127.0.0.1:55433/analytics_test";
const suite = safe ? describe : describe.skip;
const prefix = `purchase-test-${randomUUID()}`;
const buyer = { name: "Fixture Buyer", billedTo: "Fixture Business", email: `${prefix}@example.invalid`, stateCode: "22", address: "Fixture", city: "Raipur", pin: "492001", gstin: "", phone: "9999999999" };
const orders: string[] = [];
async function create(paid = true, period = "monthly", users = 1) {
  const id = `${prefix}-${orders.length}`;orders.push(id);
  const value = period === "monthly" ? Math.max(users, 8) * 300 : users * 2500;
  return prisma.templateCheckout.create({ data: { id, accessHash: id, requestHash: id, organizationId: "seller-fixture-never-activated", totalPaise: value * 118,
    ...(paid ? { paidAt: new Date(), gatewayPaymentId: `pay_${id.replaceAll("-", "")}`, invoiceNumber: `TEST/${id}` } : {}),
    snapshot: { version: 1, kind: "tasks", subscription: { period, users, whatsappApi: false, autoRenew: false }, buyer,
      seller: { legalName: "Test", tradeName: "Test", stateCode: "22", gstin: "22BPFPK7002F1ZG", addressLines: ["Fixture"] },
      lines: [{ name: "Tasks", priceInr: value, quantity: period === "monthly" ? Math.max(users,8) : users, sac: "998313" }],
      totals: { subtotalPaise: value * 100, totalPaise: value * 118, cgstPaise: value * 9, sgstPaise: value * 9, igstPaise: 0, lines: [{ gstAmount: value * .18, totalAmount: value * 1.18 }] },
    },
  } });
}
afterAll(async () => { if (!safe) return;const rows=await prisma.templateCheckout.findMany({ where: { id: { in: orders } }, select: { activatedOrganizationId: true } });await prisma.templateCheckout.deleteMany({ where: { id: { in: orders } } });for(const row of rows)if(row.activatedOrganizationId)await prisma.organization.delete({ where: { id: row.activatedOrganizationId } });await prisma.user.deleteMany({ where: { email: buyer.email } });await prisma.$disconnect(); });
suite("isolated paid Tasks activation, no customer messages", () => {
  it("rejects unpaid orders without provisioning", async () => {const order=await create(false);await expect(activatePaidTasksCheckout(order.id)).rejects.toThrow("not been verified");expect((await prisma.templateCheckout.findUniqueOrThrow({where:{id:order.id}})).activatedAt).toBeNull();});
  it("concurrent repeats create one Tasks-only workspace, one owner and a stable term", async () => {
    const order=await create();const results=await Promise.all([activatePaidTasksCheckout(order.id),activatePaidTasksCheckout(order.id)]);
    expect(results[0].activatedOrganizationId).toBe(results[1].activatedOrganizationId);expect(results[0].accessEndsAt).toEqual(results[1].accessEndsAt);
    const org=await prisma.organization.findUniqueOrThrow({where:{id:results[0].activatedOrganizationId!},include:{memberships:true}});
    expect(org.id).not.toBe(order.organizationId);expect(org.allowedModules).toEqual(["TASKS"]);expect(org.maxMembers).toBe(8);expect(org.isPrimary).toBe(false);expect(org.memberships).toHaveLength(1);expect(org.memberships[0].role).toBe("OWNER");
    const user=await prisma.user.findUniqueOrThrow({where:{email:buyer.email}});expect(user.emailVerified).toBeNull();expect(user.passwordHash).toBeTruthy();
    mail.mockClear();await Promise.all([emailPaidCheckout(order.id),emailPaidCheckout(order.id)]);expect(mail).toHaveBeenCalledTimes(1);
    expect(mail.mock.calls[0]?.[0]).toMatchObject({ subject: expect.stringContaining("Tasks workspace"), idempotencyKey: `checkout-invoice-v1/${order.id}`, text: expect.stringContaining("/guides/tasks-setup") });
  });
  it("annual purchases preserve existing identity and do not receive eight seats", async () => {
    const before=await prisma.user.findUniqueOrThrow({where:{email:buyer.email}});const order=await create(true,"yearly",2);const paid=await activatePaidTasksCheckout(order.id);
    expect((await prisma.organization.findUniqueOrThrow({where:{id:paid.activatedOrganizationId!}})).maxMembers).toBe(2);
    expect((await prisma.user.findUniqueOrThrow({where:{email:buyer.email}})).passwordHash).toBe(before.passwordHash);
  });
  it("keeps activation on delivery failure and retries with the same operation key", async () => {
    const order=await create();const active=await activatePaidTasksCheckout(order.id);
    mail.mockClear();mail.mockRejectedValueOnce(new Error("Fixture provider timeout"));
    await expect(emailPaidCheckout(order.id)).rejects.toThrow();
    const pending=await prisma.templateCheckout.findUniqueOrThrow({where:{id:order.id}});
    expect(pending.emailSentAt).toBeNull();expect(pending.emailFirstAttemptAt).not.toBeNull();expect(pending.activatedOrganizationId).toBe(active.activatedOrganizationId);
    await emailPaidCheckout(order.id);expect(mail).toHaveBeenCalledTimes(2);
    expect(mail.mock.calls[0][0]).toEqual(mail.mock.calls[1][0]);
  });
  it("does not blindly resend outside the provider deduplication window", async () => {
    const order=await create();await activatePaidTasksCheckout(order.id);
    await prisma.templateCheckout.update({where:{id:order.id},data:{emailFirstAttemptAt:new Date(Date.now()-24*60*60_000)}});
    mail.mockClear();await expect(emailPaidCheckout(order.id)).rejects.toThrow("reconciliation");expect(mail).not.toHaveBeenCalled();
  });
});
