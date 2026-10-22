import { getSessionUser } from "@/lib/auth";
import { hasSuitePart } from "@/lib/workspace-access";

export async function getChecklistActor() {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required." };
  }
  if (!hasSuitePart(user, "checklists")) {
    return {
      ok: false as const,
      message: "Check Lists are not enabled for your account.",
    };
  }
  return { ok: true as const, user };
}
