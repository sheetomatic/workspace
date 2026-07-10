import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { uploadEmployeeDocument } from "@/lib/hr/employees";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  if (!hasWorkspaceModule(user, "HR")) {
    return NextResponse.json({ error: "HR access required" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const employeeProfileId = String(form.get("employeeProfileId") ?? "").trim();
  const docTypeRaw = String(form.get("docType") ?? "OTHER").trim();
  if (!employeeProfileId) {
    return NextResponse.json(
      { error: "employeeProfileId is required." },
      { status: 400 },
    );
  }
  if (!["AADHAAR", "PAN", "OFFER_LETTER", "CONTRACT", "OTHER"].includes(docTypeRaw)) {
    return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
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
      { error: "Only PDF, PNG, JPG, or WEBP files are allowed." },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await uploadEmployeeDocument({
      organizationId: user.organizationId,
      employeeProfileId,
      uploadedById: user.id,
      docType: docTypeRaw as
        | "AADHAAR"
        | "PAN"
        | "OFFER_LETTER"
        | "CONTRACT"
        | "OTHER",
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      data: buffer,
    });
    return NextResponse.json({ document });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not upload document.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
