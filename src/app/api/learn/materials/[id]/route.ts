import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { findTrainingSlotForOrg } from "@/lib/courses/session-materials";
import { getLearnEnrollment } from "@/lib/learn/session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const material = await prisma.trainingSessionMaterial.findFirst({
    where: { id },
    select: {
      id: true,
      title: true,
      fileName: true,
      mimeType: true,
      data: true,
      url: true,
      slot: {
        select: { id: true, enrollmentId: true },
      },
    },
  });
  if (!material) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const student = await getLearnEnrollment();
  const staff = await getSessionUser();
  const studentOk = student?.id === material.slot.enrollmentId;
  const staffOk = staff
    ? Boolean(await findTrainingSlotForOrg(material.slot.id, staff.organizationId))
    : false;

  if (!studentOk && !staffOk) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (material.url && !material.data) {
    return NextResponse.redirect(material.url);
  }
  if (!material.data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filename = material.fileName || `${material.title || "document"}.bin`;
  return new NextResponse(new Uint8Array(material.data), {
    headers: {
      "Content-Type": material.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
