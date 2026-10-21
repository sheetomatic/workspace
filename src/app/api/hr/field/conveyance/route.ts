import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFieldConveyanceActor } from "@/lib/hr/field-conveyance-access";
import {
  canResubmitFieldConveyance,
  canTransitionFieldConveyance,
  hasRequiredConveyanceProofs,
} from "@/lib/hr/field-conveyance-rules";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function validDateOnly(raw: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [year, month, day] = raw.split("-").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  ) {
    return null;
  }
  return calendar;
}

function decimalValue(raw: string, maximum: number) {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 && value <= maximum ? value : null;
}

async function readClaimFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    throw new Error("Both journey proof and bill attachment are required.");
  }
  if (value.size > MAX_FILE_BYTES) {
    throw new Error("Each proof file must be 8 MB or smaller.");
  }
  if (!ALLOWED_MIME_TYPES.has(value.type)) {
    throw new Error("Proof files must be PDF, JPG, PNG, or WEBP.");
  }
  return {
    fileName: value.name.replace(/[\r\n\0]/g, "").slice(0, 255) || "proof",
    mimeType: value.type,
    size: value.size,
    data: Buffer.from(await value.arrayBuffer()),
  };
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const actor = await getFieldConveyanceActor(user);
  if (!actor || actor.role === "VIEWER") {
    return NextResponse.json({ error: "Field access is required to submit claims." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid claim form." }, { status: 400 });
  }

  const claimDateRaw = String(formData.get("claimDate") ?? "").trim();
  const claimDate = validDateOnly(claimDateRaw);
  const claimedDistanceKm = decimalValue(
    String(formData.get("claimedDistanceKm") ?? "").trim(),
    5000,
  );
  const amount = decimalValue(String(formData.get("amount") ?? "").trim(), 1_000_000);
  const journeyDetails = String(formData.get("journeyDetails") ?? "").trim();
  const visitId = String(formData.get("visitId") ?? "").trim() || null;
  const claimId = String(formData.get("claimId") ?? "").trim() || null;

  if (!claimDate) {
    return NextResponse.json({ error: "Enter a valid claim date." }, { status: 400 });
  }
  const todayInIndia = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  if (claimDateRaw > todayInIndia) {
    return NextResponse.json({ error: "A conveyance claim date cannot be in the future." }, { status: 400 });
  }
  if (claimedDistanceKm == null || amount == null) {
    return NextResponse.json({ error: "Enter a positive distance and amount." }, { status: 400 });
  }
  if (journeyDetails.length < 5 || journeyDetails.length > 2000) {
    return NextResponse.json({ error: "Describe the journey in 5 to 2,000 characters." }, { status: 400 });
  }

  if (visitId) {
    const visit = await prisma.fieldVisit.findFirst({
      where: { id: visitId, organizationId: user.organizationId, assigneeUserId: user.id },
      select: { id: true },
    });
    if (!visit) {
      return NextResponse.json({ error: "Choose a visit assigned to you." }, { status: 400 });
    }
  }

  let journeyProof: Awaited<ReturnType<typeof readClaimFile>>;
  let bill: Awaited<ReturnType<typeof readClaimFile>>;
  try {
    [journeyProof, bill] = await Promise.all([
      readClaimFile(formData.get("journeyProof")),
      readClaimFile(formData.get("bill")),
    ]);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Attach journey proof and bill." },
      { status: 400 },
    );
  }

  let existing: { id: string; revision: number; status: "REJECTED" } | null = null;
  if (claimId) {
    const candidate = await prisma.fieldConveyanceClaim.findFirst({
      where: {
        id: claimId,
        organizationId: user.organizationId,
        claimantUserId: user.id,
        status: "REJECTED",
      },
      select: { id: true, revision: true, status: true },
    });
    if (candidate?.status === "REJECTED") {
      existing = { ...candidate, status: "REJECTED" };
    }
    if (!existing || !canResubmitFieldConveyance(actor, {
      claimantUserId: user.id,
      status: existing.status,
      reviewedByUserId: null,
    })) {
      return NextResponse.json({ error: "Only your rejected claim can be resubmitted." }, { status: 403 });
    }
    if (!canTransitionFieldConveyance(existing.status, "PENDING")) {
      return NextResponse.json({ error: "This claim cannot be resubmitted from its current state." }, { status: 409 });
    }
  }

  const revision = (existing?.revision ?? 0) + 1;
  const attachments = [
    { kind: "JOURNEY_PROOF" as const, file: journeyProof },
    { kind: "BILL" as const, file: bill },
  ];
  if (!hasRequiredConveyanceProofs(attachments)) {
    return NextResponse.json({ error: "Both journey proof and bill attachment are required." }, { status: 400 });
  }

  try {
    const createdId = await prisma.$transaction(async (tx) => {
      let id: string;
      if (existing) {
        const changed = await tx.fieldConveyanceClaim.updateMany({
          where: {
            id: existing.id,
            organizationId: user.organizationId,
            claimantUserId: user.id,
            status: "REJECTED",
            revision: existing.revision,
          },
          data: {
            claimDate,
            claimedDistanceKm: new Prisma.Decimal(claimedDistanceKm),
            amount: new Prisma.Decimal(amount),
            journeyDetails,
            visitId,
            status: "PENDING",
            revision,
            submittedAt: new Date(),
            reviewedByUserId: null,
            reviewedAt: null,
            rejectionReason: null,
            paidByUserId: null,
            paidAt: null,
            paymentReference: null,
          },
        });
        if (changed.count !== 1) throw new Error("This rejected claim changed. Refresh and retry.");
        id = existing.id;
      } else {
        const claim = await tx.fieldConveyanceClaim.create({
          data: {
            organizationId: user.organizationId,
            claimantUserId: user.id,
            claimDate,
            claimedDistanceKm: new Prisma.Decimal(claimedDistanceKm),
            amount: new Prisma.Decimal(amount),
            journeyDetails,
            visitId,
            revision,
          },
          select: { id: true },
        });
        id = claim.id;
      }

      await tx.fieldConveyanceAttachment.createMany({
        data: attachments.map(({ kind, file }) => ({
          organizationId: user.organizationId,
          claimId: id,
          uploadedById: user.id,
          kind,
          submissionRound: revision,
          ...file,
        })),
      });
      await tx.fieldConveyanceAuditEvent.create({
        data: {
          organizationId: user.organizationId,
          claimId: id,
          actorUserId: user.id,
          action: existing ? "RESUBMITTED" : "SUBMITTED",
          fromStatus: existing?.status ?? null,
          toStatus: "PENDING",
          note: existing ? "Claim resubmitted with updated details and proof." : "Claim submitted for approval.",
          metadata: {
            revision,
            claimedDistanceKm,
            amount,
            distanceSource: "MANUAL_CLAIM",
          },
        },
      });
      return id;
    });
    return NextResponse.json({ ok: true, claimId: createdId, status: "PENDING" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit the claim.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
