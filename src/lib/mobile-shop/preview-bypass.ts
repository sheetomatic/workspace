import type { Role } from "@prisma/client";
import { hasMinimumRole } from "@/lib/permissions";

/**
 * TEMP preview bypass (PR 41): OWNER/ADMIN may open the shop without an
 * ACTIVE billed license so the lead can see the app. Product billing is
 * unchanged — STAFF still hit the license wall.
 */
export function canPreviewMobileShopWithoutLicense(
  role: Role,
  isSuperAdmin = false,
) {
  return isSuperAdmin || hasMinimumRole(role, "ADMIN");
}
