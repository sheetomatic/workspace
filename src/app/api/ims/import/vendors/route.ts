import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { normalizeVendorImportRow } from "@/lib/ims/vendor-import";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasWorkspaceModule(user, "IMS") || !hasMinimumRole(user.role, "MANAGER")) {
    return NextResponse.json(
      { error: "Manager access to IMS is required to import vendors." },
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
      { error: "File is too large. Maximum size is 4 MB." },
      { status: 400 },
    );
  }

  let rawRows: Record<string, string>[];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "The file has no sheets." }, { status: 400 });
    }
    const sheet = workbook.Sheets[sheetName];
    rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: "",
      raw: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read the file. Use the CSV or Excel template." },
      { status: 400 },
    );
  }

  if (rawRows.length === 0) {
    return NextResponse.json(
      { error: "No data rows found below the header." },
      { status: 400 },
    );
  }

  const parsed = rawRows.map((raw, index) =>
    normalizeVendorImportRow(raw, index + 2),
  );
  const valid = parsed.filter((row) => row.valid).length;

  return NextResponse.json({
    rows: parsed,
    summary: {
      total: parsed.length,
      valid,
      invalid: parsed.length - valid,
    },
  });
}
