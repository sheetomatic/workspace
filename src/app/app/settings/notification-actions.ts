"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { sendPlainEmail } from "@/lib/integrations/email";
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

type TestEmailState = {
  ok: boolean;
  message: string;
};

export async function sendTestAlertEmailAction(
  _prev: TestEmailState | null,
  _formData: FormData,
): Promise<TestEmailState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Sign in required." };
  }

  const settings = await getOrCreateNotificationSettings(
    user.id,
    user.organizationId,
  );

  if (!settings.alertViaEmail) {
    return { ok: false, message: "Enable Email under Delivery first." };
  }

  const subject = `Sheetomatic test alert - ${user.organizationName}`;
  const text = [
    `Hello ${user.name ?? user.email.split("@")[0]},`,
    "",
    "This is a sample alert digest from Sheetomatic.",
    "",
    "- Upcoming hearing: Sample case (ABC/123) - next date tomorrow",
    "- Task due soon: Review client file - due today",
    "",
    "Manage alert preferences in Workspace > Settings.",
  ].join("\n");

  const result = await sendPlainEmail({
    toEmail: user.email,
    subject,
    text,
  });

  if (!result.sent) {
    return {
      ok: false,
      message:
        result.reason === "not_configured"
          ? "Email is not configured for this workspace."
          : "Could not send test email. Try again later.",
    };
  }

  return { ok: true, message: `Test email sent to ${user.email}.` };
}
