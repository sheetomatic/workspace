import { getSessionUser } from "@/lib/auth";
import { hasBciOpsModule } from "@/lib/workspace-modules";

export async function getChecklistActor() {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required." };
  }
  if (!hasBciOpsModule(user)) {
    return {
      ok: false as const,
      message: "Check Lists are not enabled for your account.",
    };
  }
  return { ok: true as const, user };
}
