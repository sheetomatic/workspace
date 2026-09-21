import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAdminChecklists } from "@/lib/checklists/access";
import { hasBciOpsModule } from "@/lib/workspace-modules";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || !hasBciOpsModule(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const occurrence = await prisma.checklistOccurrence.findFirst({
    where: { id, organizationId: user.organizationId },
    select: {
      assigneeUserId: true,
      proofFileName: true,
      proofMimeType: true,
      proofData: true,
    },
  });

  if (
    !occurrence?.proofData ||
    !occurrence.proofFileName ||
    (occurrence.assigneeUserId !== user.id && !canAdminChecklists(user))
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(occurrence.proofData), {
    headers: {
      "Content-Type": occurrence.proofMimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(occurrence.proofFileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
