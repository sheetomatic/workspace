/**
 * Field live GPS — re-exports FieldLocationPing helpers.
 * Kept as `@/lib/hr/field-location` for Frontend imports that landed early.
 */
export {
  FIELD_PING_MIN_INTERVAL_SEC,
  postFieldLocationPing,
  listTodayPings,
  listMyDayTrail,
  haversineMeters,
  visitGeoFenceOk,
  istDayBounds,
} from "@/lib/hr/field-pings";

/** @deprecated Prefer listTodayPings / listMyDayTrail */
export async function listFieldLocationPings(
  organizationId: string,
  options?: { userId?: string; since?: Date; limit?: number },
) {
  const { listTodayPings, listMyDayTrail } = await import("@/lib/hr/field-pings");
  if (options?.userId) {
    const trail = await listMyDayTrail(organizationId, options.userId);
    return trail.slice(0, options.limit ?? 200);
  }
  const pings = await listTodayPings(organizationId);
  const filtered = options?.since
    ? pings.filter((p) => p.recordedAt >= options.since!)
    : pings;
  return filtered.slice(0, options?.limit ?? 200);
}
