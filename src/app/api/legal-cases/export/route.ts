import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import { prisma } from "@/lib/db";
import {
  legalCasesToCsv,
  legalCasesToXlsxBuffer,
} from "@/lib/legal-cases/file-import-export";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || !isLegalAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format")?.toLowerCase() ?? "csv";
  const cases = await prisma.legalCase.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ fileNumber: "asc" }, { mccNumber: "asc" }],
  });

  const date = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") {
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

  const csv = legalCasesToCsv(cases);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="legal-cases-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
