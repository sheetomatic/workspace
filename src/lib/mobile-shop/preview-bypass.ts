import type { Role } from "@prisma/client";

/**
 * Closed. Mobile Shop is not a preview for owners or the Sheetomatic team.
 * Open it by licensing the client kit, or ticking Mobile Shop on that person.
 */
export function canPreviewMobileShopWithoutLicense(
  _role: Role,
  _isSuperAdmin = false,
) {
  return false;
}
