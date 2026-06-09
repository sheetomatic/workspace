import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canViewLegalCase } from "@/lib/legal-cases/access";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const document = await prisma.legalCaseDocument.findUnique({
    where: { id },
    include: {
      legalCase: true,
    },
  });

  if (
    !document ||
    document.organizationId !== user.organizationId ||
    !canViewLegalCase(user, document.legalCase)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(document.data), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(document.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
