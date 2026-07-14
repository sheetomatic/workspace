import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import { isHrSubModuleEnabled } from "@/lib/hr/hr-sub-modules";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

async function hasFieldTrackingAccess(organizationId: string) {
  const settings = await getOrCreateHrSettings(organizationId);
  return isHrSubModuleEnabled(settings.enabledHrSubModules, "field");
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasMinimumRole(user.role, "STAFF")) {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  if (!hasWorkspaceModule(user, "HR")) {
    return NextResponse.json({ error: "HR access required" }, { status: 403 });
  }
  if (!(await hasFieldTrackingAccess(user.organizationId))) {
    return NextResponse.json(
      { error: "Field tracking is disabled" },
      { status: 403 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Maximum size is 8 MB." },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Only PDF, PNG, JPG, WEBP, or HEIC files are allowed." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const attachment = await prisma.fieldCheckInAttachment.create({
    data: {
      organizationId: user.organizationId,
      fileName: file.name.slice(0, 255) || "field-proof.jpg",
      mimeType: file.type,
      size: file.size,
      data: buffer,
      uploadedById: user.id,
    },
    select: { id: true, fileName: true, size: true, mimeType: true },
  });

  return NextResponse.json({ attachment });
}
