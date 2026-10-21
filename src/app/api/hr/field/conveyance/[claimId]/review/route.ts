import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFieldConveyanceActor } from "@/lib/hr/field-conveyance-access";
import { canReviewFieldConveyance, canTransitionFieldConveyance } from "@/lib/hr/field-conveyance-rules";

type RouteContext = { params: Promise<{ claimId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const actor = await getFieldConveyanceActor(user);
  if (!actor) return NextResponse.json({ error: "Field access is required." }, { status: 403 });

  let body: { decision?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  }
  const decision = body.decision;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return NextResponse.json({ error: "Choose approve or reject." }, { status: 400 });
  }
  if (decision === "REJECTED" && (reason.length < 5 || reason.length > 500)) {
    return NextResponse.json({ error: "A rejection reason of 5 to 500 characters is required." }, { status: 400 });
  }

  const { claimId } = await context.params;
  const claim = await prisma.fieldConveyanceClaim.findFirst({
    where: { id: claimId, organizationId: user.organizationId },
    select: { id: true, claimantUserId: true, status: true },
  });
  if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  if (!canReviewFieldConveyance(actor, {
    claimantUserId: claim.claimantUserId,
    status: claim.status,
    reviewedByUserId: null,
  })) {
    return NextResponse.json({ error: "Only a separate Manager/Admin/Owner may review a pending claim." }, { status: 403 });
  }

  const toStatus = decision;
  if (!canTransitionFieldConveyance(claim.status, toStatus)) {
    return NextResponse.json({ error: "This claim has already changed state." }, { status: 409 });
  }
  try {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.fieldConveyanceClaim.updateMany({
        where: { id: claim.id, organizationId: user.organizationId, status: "PENDING" },
        data: {
          status: toStatus,
          reviewedByUserId: user.id,
          reviewedAt: new Date(),
          rejectionReason: decision === "REJECTED" ? reason : null,
        },
      });
      if (changed.count !== 1) throw new Error("Claim already reviewed. Refresh to see its current status.");
      await tx.fieldConveyanceAuditEvent.create({
        data: {
          organizationId: user.organizationId,
          claimId: claim.id,
          actorUserId: user.id,
          action: decision,
          fromStatus: "PENDING",
          toStatus,
          note: decision === "REJECTED" ? reason : (reason || "Approved after details and proof review."),
        },
      });
    });
    return NextResponse.json({ ok: true, status: toStatus });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not review claim." },
      { status: 409 },
    );
  }
}
