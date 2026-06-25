import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasWorkspaceModule } from "@/lib/workspace-modules";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasWorkspaceModule(user, "IMS")) {
    return new Response("IMS access required", { status: 403 });
  }

  const { id } = await params;
  const attachment = await prisma.imsAttachment.findFirst({
    where: { id, organizationId: user.organizationId },
  });

  if (!attachment) {
    return new Response("Not found", { status: 404 });
  }

  const body = new Uint8Array(attachment.data);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.size),
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        attachment.fileName,
      )}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
