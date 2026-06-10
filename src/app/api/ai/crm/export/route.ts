import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { AI_APP_MIN_ROLE } from "@/lib/ai-auth-links";
import { listWaCrmContactsForSheetExport } from "@/lib/wa-crm";
import { waCrmContactsToSheetRows } from "@/lib/wa-crm-sheet-export";
import { rowsToCsv } from "@/lib/csv-utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, AI_APP_MIN_ROLE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contacts = await listWaCrmContactsForSheetExport(user.organizationId);
  const rows = waCrmContactsToSheetRows(contacts);
  const csv = rowsToCsv(rows);
  const filename = `wa-crm-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
