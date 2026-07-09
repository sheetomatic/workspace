import type { Role, WorkspaceModule } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AI_APP_MIN_ROLE } from "@/lib/ai-auth-links";
import { isLegalCasesOrganization } from "@/lib/dedicated-client-portals";
import { hasMinimumRole } from "@/lib/permissions";
import { hasWorkspaceModule } from "@/lib/workspace-modules";

export async function requireSession(
  minRole?: Role,
  options?: { redirectTo?: string; module?: WorkspaceModule },
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

  if (
    options?.module &&
    !hasWorkspaceModule(user, options.module)
  ) {
    redirect(options?.redirectTo ?? "/app");
  }

  return user;
}

export async function requireAiSession(options?: { redirectTo?: string }) {
  return requireSession(AI_APP_MIN_ROLE, {
    redirectTo: options?.redirectTo ?? "/app",
  });
}

export async function requireLegalCasesSession(
  minRole?: Role,
  options?: { redirectTo?: string },
) {
  const user = await requireSession(minRole, {
    module: "CASES",
    redirectTo: options?.redirectTo,
  });
  if (!isLegalCasesOrganization(user.organizationSlug)) {
    redirect(options?.redirectTo ?? "/app");
  }
  return user;
}
