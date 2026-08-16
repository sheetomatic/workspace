import { NextResponse } from "next/server";
import {
  LEARN_WORKBOOK_FILENAME,
  buildMsmeWorkbookBuffer,
} from "@/lib/learn/msme-workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const buffer = buildMsmeWorkbookBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${LEARN_WORKBOOK_FILENAME}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
