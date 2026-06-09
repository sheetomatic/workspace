"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import {
  getOrCreateNotificationSettings,
  parseNotificationSettingsForm,
} from "@/lib/notification-settings";
import { prisma } from "@/lib/db";

export async function saveNotificationSettingsAction(
  formData: FormData,
): Promise<void> {
  const user = await getSessionUser();
  if (!user) {
    return;
  }

  const settings = parseNotificationSettingsForm(formData);

  await getOrCreateNotificationSettings(user.id, user.organizationId);
  await prisma.userNotificationSettings.update({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: user.organizationId,
      },
    },
    data: settings,
  });

  revalidatePath("/app/settings");
}
