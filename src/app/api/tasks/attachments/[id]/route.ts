import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canUpdateTask } from "@/lib/tasks";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const attachment = await prisma.taskAttachment.findUnique({
    where: { id },
    include: {
      task: {
        select: {
          organizationId: true,
          assigneeUserId: true,
          createdById: true,
        },
      },
    },
  });

  if (
    !attachment ||
    attachment.task.organizationId !== user.organizationId ||
    !canUpdateTask(user, attachment.task)
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
