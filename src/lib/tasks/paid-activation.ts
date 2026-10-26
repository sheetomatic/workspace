import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { CheckoutSnapshot } from "@/lib/templates/checkout";
import { tasksPurchaseTerm } from "./purchase-term";
import { tasksCheckoutLines, tasksCheckoutTotals } from "./checkout-commerce";

/** Initial purchases create a dedicated Tasks workspace, never alter an existing tenant. */
export async function activatePaidTasksCheckout(orderId: string) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`tasks-purchase:${orderId}`}, 0))`;
    const order = await tx.templateCheckout.findUniqueOrThrow({ where: { id: orderId } });
    const snapshot = order.snapshot as unknown as CheckoutSnapshot;
    if (snapshot.kind !== "tasks") return order;
    if (!order.paidAt || !order.gatewayPaymentId || !order.invoiceNumber) throw new Error("Payment has not been verified.");
    if (order.activatedOrganizationId) return order;
    const purchase = snapshot.subscription;
    if (!purchase || purchase.autoRenew !== false) throw new Error("Invalid purchase terms.");
    const start = new Date();
    const term = tasksPurchaseTerm(purchase.period, purchase.users, start);
    const lines = tasksCheckoutLines(purchase);
    const total = tasksCheckoutTotals(lines.map(line => line.priceInr), snapshot.buyer.stateCode, snapshot.seller.stateCode);
    if (total.totalPaise !== order.totalPaise) throw new Error("Purchased amount does not match activation terms.");
    const email = snapshot.buyer.email.trim().toLowerCase();
    // Serialize purchases for the same owner without overwriting existing identity fields.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`tasks-owner:${email}`}, 0))`;
    const user = await tx.user.upsert({ where: { email }, update: {}, create: {
      email, name: snapshot.buyer.name,
      // Unknown random password enables the existing email reset flow, never sent in a message.
      passwordHash: await bcrypt.hash(randomBytes(32).toString("base64url"), 10),
    } });
    if (!user.passwordHash) throw new Error("Existing account needs secure sign-in setup before activation; do not pay again.");
    const slug = `tasks-${createHash("sha256").update(order.id).digest("hex").slice(0, 24)}`;
    const billingPeriod = purchase.period === "monthly" ? "MONTHLY" : "ANNUAL";
    const workspace = await tx.organization.create({ data: {
      name: snapshot.buyer.billedTo || snapshot.buyer.name, slug,
      isPrimary: false, status: "ACTIVE", product: "TASKS", plan: "TASKS_ADDON", planStatus: "ACTIVE", billingPeriod,
      allowedModules: ["TASKS"], allowedSuiteParts: [], maxMembers: term.seats, maxFmsTemplates: 0,
      memberships: { create: { userId: user.id, role: "OWNER", modules: ["TASKS"], enabledBciSubModules: [] } },
      organizationPlan: { create: { plan: "TASKS_ADDON", status: "ACTIVE", billingPeriod, activatedAt: start, renewalAt: term.endsAt } },
    } });
    return tx.templateCheckout.update({ where: { id: order.id }, data: {
      activatedOrganizationId: workspace.id, activatedAt: start, accessEndsAt: term.endsAt,
    } });
  }, { timeout: 20_000 });
}
