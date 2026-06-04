import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { tasksToCsv } from "@/lib/task-export";
import { listTasksForExport } from "@/lib/tasks";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await listTasksForExport(user);
  const csv = tasksToCsv(tasks);
  const filename = `sheetomatic-tasks-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
