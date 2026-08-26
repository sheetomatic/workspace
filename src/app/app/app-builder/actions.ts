"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import {
  parseAppBuilderStudioInput,
  saveAppBuilderStudio,
} from "@/lib/app-builder/persist";

export async function saveAppBuilderStudioAction(raw: {
  config: unknown;
  workbook: unknown;
  templateId?: string | null;
}): Promise<{ ok: boolean; message: string }> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Sign in to save the app." };
  }
  const parsed = parseAppBuilderStudioInput(raw);
  if (!parsed) {
    return { ok: false, message: "Could not save — pick a template or connect a Sheet first." };
  }
  await saveAppBuilderStudio(user.organizationId, parsed);
  revalidatePath("/app/app-builder");
  return { ok: true, message: "App saved." };
}
