"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { exportTasksToGoogleSheet } from "@/lib/integrations/google-sheets-tasks-export";
import { listTasksForExport } from "@/lib/tasks";

export async function exportTasksToGoogleSheetAction() {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required." };
  }

  const tasks = await listTasksForExport(user);
  const result = await exportTasksToGoogleSheet(user.organizationId, tasks);

  if (result.ok) {
    revalidatePath("/app/tasks");
  }

  return result;
}
