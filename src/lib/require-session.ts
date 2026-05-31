import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";

export async function requireSession(
  minRole?: Role,
  options?: { redirectTo?: string },
) {
  const user = await getSessionUser();

  if (!user) {
    redirect(
      "/api/auth/signout?callbackUrl=" +
        encodeURIComponent("/login?error=session"),
    );
  }

  if (minRole && !user.isSuperAdmin && !hasMinimumRole(user.role, minRole)) {
    redirect(options?.redirectTo ?? "/app");
  }

  return user;
}
