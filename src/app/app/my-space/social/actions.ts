"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/require-session";
import { isPrimaryOrganization } from "@/lib/platform";
import {
  improveSocialPostWithAiAndSave,
  updateSocialPostStatus,
} from "@/lib/my-space/social/schedule";

async function requireSocialScheduleAccess() {
  const user = await requireSession("MANAGER");
  const primary = await isPrimaryOrganization(user.organizationId);
  if (!user.isSuperAdmin && !primary) {
    throw new Error(
      "Social schedule is available on the primary Sheetomatic workspace only",
    );
  }
  return user;
}

function revalidateSocial() {
  revalidatePath("/app/my-space/social");
  revalidatePath("/app/my-space");
}

export async function socialScheduleAction(formData: FormData) {
  const user = await requireSocialScheduleAccess();
  const postId = String(formData.get("postId") || "");
  const action = String(formData.get("action") || "") as
    | "approve"
    | "improve"
    | "posted"
    | "reset";
  const feedback = String(formData.get("feedback") || "");

  if (!postId || !["approve", "improve", "posted", "reset"].includes(action)) {
    throw new Error("Invalid action");
  }

  if (action === "improve") {
    try {
      await improveSocialPostWithAiAndSave({
        organizationId: user.organizationId,
        postId,
        feedback,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI improve failed";
      if (msg === "OPENAI_NOT_CONFIGURED") {
        throw new Error("OpenAI is not configured on this environment");
      }
      if (msg.startsWith("OPENAI_ERROR:")) {
        throw new Error(msg.replace("OPENAI_ERROR:", ""));
      }
      if (msg === "OPENAI_EMPTY") {
        throw new Error("AI returned an empty rewrite — try again");
      }
      throw e instanceof Error ? e : new Error(msg);
    }
    revalidateSocial();
    return;
  }

  await updateSocialPostStatus({
    organizationId: user.organizationId,
    postId,
    action,
    feedback,
  });

  revalidateSocial();
}
