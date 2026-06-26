import { getSessionUser } from "@/lib/auth";
import { hasWorkspaceModule } from "@/lib/workspace-modules";

export async function getChecklistActor() {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required." };
  }
  if (!hasWorkspaceModule(user, "TASKS")) {
    return { ok: false as const, message: "Tasks module is not enabled for your account." };
  }
  return { ok: true as const, user };
}
