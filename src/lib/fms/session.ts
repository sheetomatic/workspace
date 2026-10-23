import { getSessionUser, type SessionUser } from "@/lib/auth";
import { hasSuitePart } from "@/lib/workspace-access";

export type FmsActorResult =
  | { ok: true; user: SessionUser }
  | { ok: false; message: string };

export async function getFmsActor(): Promise<FmsActorResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Sign in required." };
  }
  if (!hasSuitePart(user, "fms")) {
    return { ok: false, message: "FMS is not enabled for your account." };
  }
  return { ok: true, user };
}
