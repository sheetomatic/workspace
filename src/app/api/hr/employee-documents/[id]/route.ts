import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { getEmployeeDocumentForDownload } from "@/lib/hr/employees";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasWorkspaceModule(user, "HR")) {
    return new Response("HR access required", { status: 403 });
  }

  const { id } = await params;
  const document = await getEmployeeDocumentForDownload({
    organizationId: user.organizationId,
    documentId: id,
  });
  if (!document) {
    return new Response("Not found", { status: 404 });
  }

  const isAdmin = hasMinimumRole(user.role, "ADMIN");
  if (!isAdmin) {
    const profile = await prisma.employeeProfile.findFirst({
      where: {
        id: document.employeeProfileId,
        organizationId: user.organizationId,
        userId: user.id,
      },
      select: { id: true },
    });
    if (!profile) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const body = new Uint8Array(document.data);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(document.fileSize),
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        document.fileName,
      )}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
