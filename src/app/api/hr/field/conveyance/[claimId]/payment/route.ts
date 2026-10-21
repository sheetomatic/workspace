import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFieldConveyanceActor } from "@/lib/hr/field-conveyance-access";
import { canProcessFieldConveyancePayment, canTransitionFieldConveyance } from "@/lib/hr/field-conveyance-rules";

type RouteContext = { params: Promise<{ claimId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const actor = await getFieldConveyanceActor(user);
  if (!actor) return NextResponse.json({ error: "Field access is required." }, { status: 403 });

  let body: { paymentReference?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid Accounts payment record." }, { status: 400 });
  }
  const paymentReference =
    typeof body.paymentReference === "string" ? body.paymentReference.trim() : "";
  if (!paymentReference || paymentReference.length > 100 || /[\r\n\0]/.test(paymentReference)) {
    return NextResponse.json({ error: "Enter a payment reference of up to 100 characters." }, { status: 400 });
  }

  const { claimId } = await context.params;
  const claim = await prisma.fieldConveyanceClaim.findFirst({
    where: { id: claimId, organizationId: user.organizationId },
    select: {
      id: true,
      claimantUserId: true,
      reviewedByUserId: true,
      status: true,
      paymentReference: true,
    },
  });
  if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  if (!canProcessFieldConveyancePayment(actor, claim)) {
    return NextResponse.json({ error: "Only a separate Accounts processor may record payment for an approved claim." }, { status: 403 });
  }
  if (!canTransitionFieldConveyance(claim.status, "PAID")) {
    return NextResponse.json({ error: "This claim has already changed state." }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.fieldConveyanceClaim.updateMany({
        where: {
          id: claim.id,
          organizationId: user.organizationId,
          status: "APPROVED",
          paymentReference: null,
          paidAt: null,
        },
        data: {
          status: "PAID",
          paidByUserId: user.id,
          paidAt: new Date(),
          paymentReference,
        },
      });
      if (changed.count !== 1) throw new Error("Payment was already recorded or this claim is no longer approved.");
      await tx.fieldConveyanceAuditEvent.create({
        data: {
          organizationId: user.organizationId,
          claimId: claim.id,
          actorUserId: user.id,
          action: "PAID",
          fromStatus: "APPROVED",
          toStatus: "PAID",
          note: `Payment recorded by Accounts. Reference: ${paymentReference}`,
          metadata: { paymentReference },
        },
      });
    });
    return NextResponse.json({
      ok: true,
      status: "PAID",
      message: "Payment status recorded. No payment or bank transfer was initiated.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record payment.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
