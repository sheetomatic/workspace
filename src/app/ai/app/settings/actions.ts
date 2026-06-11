"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type WorkspaceStatusActionState = {
  ok: boolean;
  message: string;
};

export async function setWorkspaceStatusAction(
  _prev: WorkspaceStatusActionState,
  formData: FormData,
): Promise<WorkspaceStatusActionState> {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin) {
    return { ok: false, message: "Only super admins can change workspace status." };
  }

  const status = formData.get("status")?.toString();
  if (status !== "ACTIVE" && status !== "ONBOARDING") {
    return { ok: false, message: "Invalid status." };
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { status },
  });

  revalidatePath("/ai/app/settings");
  revalidatePath("/ai/app");
  revalidatePath("/app");

  return {
    ok: true,
    message:
      status === "ACTIVE"
        ? "Workspace activated. Members can sign in and use the app now."
        : "Workspace set to pending. Members see the activation hold screen.",
  };
}
