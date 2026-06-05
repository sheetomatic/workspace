import type { Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";

import { aiPortalOrigin } from "@/lib/workspace-auth-links";

/** Sheetomatic AI marketing → auth entry points (path-only; use aiPortalOrigin() for absolute URLs). */
export const AI_LOGIN_HREF = "/login?product=ai&intent=login";
export const AI_START_FREE_HREF = "/login?product=ai&intent=start";

export function aiLoginHref(intent: "login" | "start" = "login") {
  const base = aiPortalOrigin();
  return `${base}/login?product=ai&intent=${intent}`;
}

/** WhatsApp AI, wallet, and integrations are admin-only — not workspace staff. */
export const AI_APP_MIN_ROLE = "ADMIN" as const satisfies Role;

export function canAccessAiApp(
  user: Pick<SessionUser, "role" | "isSuperAdmin">,
) {
  return user.isSuperAdmin || hasMinimumRole(user.role, AI_APP_MIN_ROLE);
}

export function aiAppEntryHref(_intent?: string | null) {
  return "/ai/app";
}
