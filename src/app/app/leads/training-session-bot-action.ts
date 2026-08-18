"use server";

import { revalidatePath } from "next/cache";
import { findTrainingSlotForStaff } from "@/lib/courses/session-materials";
import { mapFmsOpenAiServiceError } from "@/lib/integrations/openai-messages";
import { runLearnSessionBot } from "@/lib/learn/session-bot";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";

function refreshLearn() {
  revalidatePath("/app/leads/training");
  revalidatePath("/app/my-space/training");
  revalidatePath("/learn");
  revalidatePath("/learn/contents");
  revalidatePath("/learn/courses");
  revalidatePath("/learn/schedule");
}

export async function runLearnSessionBotAction(slotId: string) {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "STAFF") && !user.isSuperAdmin) {
    return { ok: false as const, message: "Staff access required." };
  }

  const id = slotId.trim();
  if (!id) {
    return { ok: false as const, message: "Session is required." };
  }

  const slot = await findTrainingSlotForStaff(
    id,
    user.organizationId,
    user.isSuperAdmin,
  );
  if (!slot) {
    return { ok: false as const, message: "Session not found." };
  }

  try {
    const result = await runLearnSessionBot({
      slotId: slot.id,
      userId: user.id,
    });
    if (result.ok) refreshLearn();
    return result;
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Failed to update Learn.";
    if (raw === "OPENAI_NOT_CONFIGURED" || raw.startsWith("OPENAI_")) {
      return {
        ok: false as const,
        message: mapFmsOpenAiServiceError(raw.replace(/^OPENAI_ERROR:/, "")),
      };
    }
    console.error("[learn-bot]", error);
    return {
      ok: false as const,
      message: "Could not update Learn. Try again in a moment.",
    };
  }
}
