import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessFmsStepAttachment } from "@/lib/fms/attachment-access";
import { hasWorkspaceModule } from "@/lib/workspace-modules";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || !hasWorkspaceModule(user, "FMS")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const attachment = await prisma.fmsStepAttachment.findUnique({
    where: { id },
    include: {
      stepState: {
        include: {
          instance: {
            include: {
              submission: { select: { submittedById: true } },
              stepStates: {
                select: {
                  ownerUserId: true,
                  completedByUserId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (
    !attachment ||
    !canAccessFmsStepAttachment(user, {
      organizationId: attachment.stepState.instance.organizationId,
      submission: attachment.stepState.instance.submission,
      stepStates: attachment.stepState.instance.stepStates,
    })
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(attachment.data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
