"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { activatePendingWorkspaceBySlug } from "@/lib/workspace-signup-activation";

export type SignupApprovalActionState = {
  ok: boolean;
  message: string;
};

function revalidateSignupApprovalSurfaces() {
  revalidatePath("/app/approvals");
  revalidatePath("/ai/app/settings");
  revalidatePath("/ai/app");
  revalidatePath("/app");
}

export async function activateSignupWorkspaceAction(
  _prev: SignupApprovalActionState,
  formData: FormData,
): Promise<SignupApprovalActionState> {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin) {
    return { ok: false, message: "Only super admins can activate workspaces." };
  }

  const workspaceSlug = formData.get("workspaceSlug")?.toString().trim();
  if (!workspaceSlug) {
    return { ok: false, message: "Workspace not found." };
  }

  const result = await activatePendingWorkspaceBySlug(workspaceSlug);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateSignupApprovalSurfaces();
  return { ok: true, message: result.message };
}
