"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { syncWorkspaceDashboardFromGoogleSheets } from "@/lib/integrations/sync-sheets-to-db";
import { hasMinimumRole } from "@/lib/permissions";
import { updateTaskAiSettings } from "@/lib/integrations/task-ai-settings";
import { updateWorkspaceGoogleSheet, updateWorkspaceProfile } from "@/lib/workspace";

export type WorkspaceSettingsState = {
  ok: boolean;
  message: string;
};

export async function saveWorkspaceName(
  _prev: WorkspaceSettingsState,
  formData: FormData,
): Promise<WorkspaceSettingsState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "You must be signed in." };
  }

  const name = formData.get("name")?.toString() ?? "";

  try {
    await updateWorkspaceProfile(user, { name });
    revalidatePath("/app");
    revalidatePath("/app/settings");
    return { ok: true, message: "Workspace name updated." };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save settings.";
    return { ok: false, message };
  }
}

export async function saveGoogleSheetId(
  _prev: WorkspaceSettingsState,
  formData: FormData,
): Promise<WorkspaceSettingsState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "You must be signed in." };
  }

  const googleSheetId = formData.get("googleSheetId")?.toString() ?? "";

  try {
    await updateWorkspaceGoogleSheet(user, { googleSheetId });
    revalidatePath("/app/settings");
    revalidatePath("/app/cases");
    revalidatePath("/app/cases/list");
    return { ok: true, message: "Google Sheet link saved." };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save sheet ID.";
    return { ok: false, message };
  }
}

export async function syncDashboardFromSheetsAction(
  _prev: WorkspaceSettingsState,
): Promise<WorkspaceSettingsState> {
  return syncDashboardFromSheets();
}

export async function syncDashboardFromSheets(): Promise<WorkspaceSettingsState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "You must be signed in." };
  }

  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can sync from Google Sheets." };
  }

  try {
    const result = await syncWorkspaceDashboardFromGoogleSheets(
      user.organizationId,
    );
    revalidatePath("/app");
    revalidatePath("/app/settings");
    return {
      ok: true,
      message: `Synced ${result.counts.metrics} metrics, ${result.counts.followUps} follow-ups, ${result.counts.payments} payments, ${result.counts.approvals} approvals from Google Sheets.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not sync from Google Sheets.";
    return { ok: false, message };
  }
}

export async function saveTaskAiSettings(
  _prev: WorkspaceSettingsState,
  formData: FormData,
): Promise<WorkspaceSettingsState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "You must be signed in." };
  }

  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "Only admins can change Task AI limits." };
  }

  const dailyLimit = Number(formData.get("dailyLimit")?.toString() ?? "200");
  const enabled = formData.get("enabled") === "on";

  if (!Number.isFinite(dailyLimit) || dailyLimit < 1) {
    return { ok: false, message: "Daily limit must be at least 1." };
  }

  try {
    await updateTaskAiSettings(user.organizationId, {
      dailyLimit,
      enabled,
    });
    revalidatePath("/app/settings");
    revalidatePath("/app/tasks");
    return { ok: true, message: "Task AI limits saved." };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save Task AI settings.";
    return { ok: false, message };
  }
}
