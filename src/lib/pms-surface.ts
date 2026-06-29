/**
 * PMS / KRA / KPI product surface toggles and reference material for future build-out.
 *
 * Reference videos (keep for PMS implementation):
 * - Drive walkthrough: https://drive.google.com/file/d/189O-T0XsnZkhQFKZqQP8B7KRD-BO2j2r/view?usp=sharing
 * - YouTube overview: https://www.youtube.com/watch?v=FsnlwMwV0Uw
 * - Actual PMS demo: https://www.youtube.com/watch?v=WOuVMIZHBwg
 */

/** Hide PMS nav and MIS scores until the module is ready for customers. */
export const PMS_SURFACE_HIDDEN = true;

/** Hide person-wise KRA tables and on-time KPI tiles until PMS ships. */
export const KRA_KPI_SURFACE_HIDDEN = true;

export const PMS_REFERENCE_VIDEOS = {
  referenceDrive:
    "https://drive.google.com/file/d/189O-T0XsnZkhQFKZqQP8B7KRD-BO2j2r/view?usp=sharing",
  youtubeWalkthrough: "https://www.youtube.com/watch?v=FsnlwMwV0Uw",
  actualPms: "https://www.youtube.com/watch?v=WOuVMIZHBwg",
} as const;
