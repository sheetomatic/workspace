import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFieldConveyanceActor } from "@/lib/hr/field-conveyance-access";
import { canReadFieldConveyanceAttachment } from "@/lib/hr/field-conveyance-rules";

type RouteContext = { params: Promise<{ attachmentId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const actor = await getFieldConveyanceActor(user);
  if (!actor) return NextResponse.json({ error: "Field access is required." }, { status: 403 });

  const { attachmentId } = await context.params;
  const attachment = await prisma.fieldConveyanceAttachment.findFirst({
    where: { id: attachmentId, organizationId: user.organizationId },
    include: {
      claim: {
        select: {
          organizationId: true,
          claimantUserId: true,
          reviewedByUserId: true,
          status: true,
        },
      },
    },
  });
  if (!attachment || attachment.claim.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }

  if (!canReadFieldConveyanceAttachment(actor, attachment.claim)) {
    return NextResponse.json({ error: "You cannot view this claim attachment." }, { status: 403 });
  }

  const safeName = attachment.fileName.replace(/[\r\n"\\]/g, "_");
  return new Response(new Uint8Array(attachment.data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.size),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
