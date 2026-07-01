export type HrActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export const HR_OUT_OF_LOCATION_MESSAGE =
  "Out of location — you are outside the office geo-fence. Check-in is not allowed.";

export const HR_GEO_REQUIRED_MESSAGE =
  "GPS location is required. Tap “Use my location”, then check in with GPS.";

export function hrActionFailure(
  code: string,
  message: string,
): Extract<HrActionResult, { ok: false }> {
  return { ok: false, code, message };
}

export function mapCheckInError(error: unknown): Extract<HrActionResult, { ok: false }> {
  const message =
    error instanceof Error ? error.message : "Could not check in. Try again.";
  if (
    message.toLowerCase().includes("outside") ||
    message.toLowerCase().includes("out of location")
  ) {
    return hrActionFailure("OUT_OF_LOCATION", HR_OUT_OF_LOCATION_MESSAGE);
  }
  if (message.toLowerCase().includes("gps")) {
    return hrActionFailure("GEO_REQUIRED", HR_GEO_REQUIRED_MESSAGE);
  }
  if (message.toLowerCase().includes("site")) {
    return hrActionFailure("SITE_REQUIRED", message);
  }
  return hrActionFailure("CHECK_IN_FAILED", message);
}
