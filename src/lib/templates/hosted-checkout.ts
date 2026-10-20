import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPrimaryOrganization } from "@/lib/platform";
import { sendPlainEmail } from "@/lib/integrations/email";
import { financialYear, templateInvoiceNumber } from "./commerce";
import {
  ownedCheckout,
  emailPaidCheckout,
  type CheckoutSnapshot,
} from "./checkout";

function paymentReference(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^pay_[a-zA-Z0-9]{6,80}$/.test(value.trim())
  )
    throw new Error("Enter the Razorpay payment ID from your receipt (pay_…).");
  return value.trim();
}

/** A customer claim is untrusted evidence, never a paid state. */
export async function claimHostedPayment(
  id: string,
  accessHash: string,
  reference: unknown,
) {
  const order = await ownedCheckout(id, accessHash);
  if (order.paymentMode !== "hosted_manual")
    throw new Error("Incorrect payment method.");
  const ref = paymentReference(reference);
  if (order.claimedPaymentRef && order.claimedPaymentRef !== ref)
    throw new Error(
      "A receipt is already awaiting review. Contact support to correct it.",
    );
  if (order.paidAt || order.paymentClaimedAt) return order;
  const changed = await prisma.templateCheckout.updateMany({
    where: { id, paymentClaimedAt: null, paidAt: null },
    data: { claimedPaymentRef: ref, paymentClaimedAt: new Date() },
  });
  if (changed.count) {
    const s = order.snapshot as unknown as CheckoutSnapshot;
    await sendPlainEmail({
      toEmail:
        process.env.COURSE_ENROLLMENT_NOTIFY_EMAIL || "sheetomatic@gmail.com",
      subject: `Template cart payment to review · ${id}`,
      text: `A customer submitted a payment claim, NOT a verified payment.\nOrder: ${id}\nBuyer: ${s.buyer.name} (${s.buyer.email})\nRazorpay reference: ${ref}\nExpected: INR ${(order.totalPaise / 100).toFixed(2)} including GST.\nReview the captured, unrefunded payment in the Sheetomatic Razorpay merchant account, then confirm at https://sheetomatic.com/app/template-orders. Never confirm from this claim alone.`,
    }).catch(() => undefined);
  }
  return ownedCheckout(id, accessHash);
}

export async function listHostedTemplateOrders() {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin) throw new Error("Not authorised.");
  const org = await getPrimaryOrganization();
  if (!org) throw new Error("Seller workspace missing.");
  return prisma.templateCheckout.findMany({
    where: {
      organizationId: org.id,
      paymentMode: "hosted_manual",
      paymentClaimedAt: { not: null },
    },
    orderBy: [
      { paidAt: { sort: "asc", nulls: "first" } },
      { createdAt: "desc" },
    ],
    take: 100,
  });
}

/** Only an authenticated operator may attest a receipt verified in the merchant account. */
export async function confirmHostedPayment(input: {
  id: string;
  reference: string;
  amountInr: string;
  verified: boolean;
}) {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin)
    throw new Error("Only super admins can confirm payments.");
  const org = await getPrimaryOrganization();
  if (!org) throw new Error("Seller workspace missing.");
  const order = await prisma.templateCheckout.findFirstOrThrow({
    where: {
      id: input.id,
      organizationId: org.id,
      paymentMode: "hosted_manual",
    },
  });
  const reference = paymentReference(input.reference);
  if (
    !input.verified ||
    !order.paymentClaimedAt ||
    reference !== order.claimedPaymentRef ||
    !/^\d+(\.\d{1,2})?$/.test(input.amountInr) ||
    Math.round(Number(input.amountInr) * 100) !== order.totalPaise
  )
    throw new Error(
      "Verify the captured, unrefunded payment, exact reference and GST-inclusive amount first.",
    );
  const now = new Date();
  const paid = await prisma.$transaction(async (tx) => {
    const changed = await tx.templateCheckout.updateMany({
      where: { id: order.id, paidAt: null },
      data: {
        paidAt: now,
        gatewayPaymentId: reference,
        confirmedById: user.id,
      },
    });
    if (changed.count) {
      const year = financialYear(now);
      const counter = await tx.templateInvoiceCounter.upsert({
        where: { year },
        create: { year, value: 1 },
        update: { value: { increment: 1 } },
      });
      await tx.templateCheckout.update({
        where: { id: order.id },
        data: { invoiceNumber: templateInvoiceNumber(year, counter.value) },
      });
    }
    return tx.templateCheckout.findUniqueOrThrow({ where: { id: order.id } });
  });
  // If email fails, payment remains verified and the same invoice can be resent without reallocating it.
  await emailPaidCheckout(paid.id);
  return paid;
}
