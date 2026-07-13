/** Region overlay on a guide snapshot (percent of image box). */
export type GuideHighlight = {
  id: string;
  /** Percent 0–100 from left of snapshot. */
  x: number;
  /** Percent 0–100 from top of snapshot. */
  y: number;
  /** Percent width of snapshot. */
  w: number;
  /** Percent height of snapshot. */
  h: number;
  shape?: "circle" | "rect" | "arrow";
  label?: string;
  /** Optional CSS selector for future live-DOM overlays. */
  selector?: string;
};

export type GuideStep = {
  id: string;
  title: string;
  body: string;
  /** Highlight ids shown for this step (from snapshot.highlights). */
  highlightIds?: string[];
  /** Prefer this snapshot when step advances. */
  snapshotId?: string;
};

export type GuideSnapshot = {
  id: string;
  src: string;
  alt: string;
  highlights: GuideHighlight[];
};

export type WorkspaceGuideModuleId =
  | "home"
  | "fms"
  | "tasks"
  | "hr-attendance"
  | "em"
  | "ims"
  | "checklists"
  | "leads";

export type WorkspaceGuide = {
  id: WorkspaceGuideModuleId;
  title: string;
  summary: string;
  /** Path prefixes that map to this guide. */
  pathPrefixes: string[];
  keywords: string[];
  primaryHref: string;
  snapshots: GuideSnapshot[];
  steps: GuideStep[];
  tips?: string[];
};
