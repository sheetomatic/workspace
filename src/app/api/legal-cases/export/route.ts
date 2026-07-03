import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import { getLegalCasesExportHeader } from "@/lib/legal-cases/export-template";
import {
  iterateLegalCaseExportBatches,
  legalCasesToExportRows,
  legalCasesToXlsxBuffer,
  loadAllLegalCasesForExport,
  rowsToCsv,
} from "@/lib/legal-cases/file-import-export";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || !isLegalAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format")?.toLowerCase() ?? "csv";
  const header = getLegalCasesExportHeader();
  const date = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") {
    const cases = await loadAllLegalCasesForExport(user.organizationId);
    const buffer = legalCasesToXlsxBuffer(cases);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="legal-cases-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`${rowsToCsv([header])}\n`));

        for await (const batch of iterateLegalCaseExportBatches(
          user.organizationId,
        )) {
          const { rows } = legalCasesToExportRows(batch, header);
          if (rows.length > 0) {
            controller.enqueue(encoder.encode(`${rowsToCsv(rows)}\n`));
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="legal-cases-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
