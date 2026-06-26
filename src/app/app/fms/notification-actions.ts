"use server";

import { revalidatePath } from "next/cache";
import { getFmsActor } from "@/lib/fms/session";
import { markAppNotificationRead } from "@/lib/fms/in-app-notifications";
import type { FmsActionState } from "@/lib/fms-action-state";

export async function markFmsAppNotificationReadAction(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  const actor = await getFmsActor();
  if (!actor.ok) {
    return { ok: false, message: actor.message };
  }

  const notificationId = formData.get("notificationId")?.toString() ?? "";
  if (!notificationId) {
    return { ok: false, message: "Missing notification." };
  }

  const updated = await markAppNotificationRead(
    notificationId,
    actor.user.id,
    actor.user.organizationId,
  );
  if (!updated) {
    return { ok: false, message: "Notification not found." };
  }

  revalidatePath("/app/fms", "layout");
  return { ok: true, message: "Dismissed." };
}
