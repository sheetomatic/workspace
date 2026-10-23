import { prisma } from "@/lib/db";
import {
  emailPaidCheckout,
  recordCapturedPayment,
} from "@/lib/templates/checkout";
import { verifyHmac } from "@/lib/templates/gateway";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  if (
    raw.length > 100000 ||
    !verifyHmac(
      raw,
      request.headers.get("x-razorpay-signature") ?? "",
      process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    )
  )
    return new Response("Invalid signature", { status: 401 });
  try {
    const event = JSON.parse(raw);
    if (event.event !== "payment.captured" && event.event !== "order.paid")
      return Response.json({ received: true });
    const payment = event.payload?.payment?.entity;
    if (
      typeof payment?.order_id !== "string" ||
      typeof payment?.id !== "string"
    )
      return new Response("Invalid event", { status: 400 });
    const order = await prisma.templateCheckout.findUnique({
      where: { gatewayOrderId: payment.order_id },
    });
    if (!order) return Response.json({ received: true }); // Other merchant products are out of scope.
    await recordCapturedPayment(order.id, payment.id);
    await emailPaidCheckout(order.id);
    return Response.json({ received: true });
  } catch {
    return new Response("Payment verification pending; retry webhook", {
      status: 503,
    });
  }
}
