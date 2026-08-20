import { getEmployeeDocsLinkContext } from "@/lib/hr/docs-link";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; documentId: string }> },
) {
  const { token: rawToken, documentId } = await params;
  const token = decodeURIComponent(rawToken);
  const ctx = await getEmployeeDocsLinkContext(token);
  if (!ctx) {
    return new Response("Not found", { status: 404 });
  }

  const document = await prisma.employeeDocument.findFirst({
    where: {
      id: documentId,
      organizationId: ctx.profile.organizationId,
      employeeProfileId: ctx.profile.id,
    },
  });
  if (!document) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(document.data), {
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
