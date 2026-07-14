import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import { isHrSubModuleEnabled } from "@/lib/hr/hr-sub-modules";

async function hasFieldTrackingAccess(organizationId: string) {
  const settings = await getOrCreateHrSettings(organizationId);
  return isHrSubModuleEnabled(settings.enabledHrSubModules, "field");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasMinimumRole(user.role, "STAFF")) {
    return new Response("Staff access required", { status: 403 });
  }
  if (!hasWorkspaceModule(user, "HR")) {
    return new Response("HR access required", { status: 403 });
  }
  if (!(await hasFieldTrackingAccess(user.organizationId))) {
    return new Response("Field tracking is disabled", { status: 403 });
  }

  const { id } = await params;
  const attachment = await prisma.fieldCheckInAttachment.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      checkIn: { select: { userId: true } },
    },
  });

  if (!attachment) {
    return new Response("Not found", { status: 404 });
  }

  // Staff can open their own proofs; managers can open any org proof.
  const isManager = hasMinimumRole(user.role, "MANAGER");
  const ownsUpload = attachment.uploadedById === user.id;
  const ownsCheckIn = attachment.checkIn?.userId === user.id;
  if (!isManager && !ownsUpload && !ownsCheckIn) {
    return new Response("Forbidden", { status: 403 });
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
