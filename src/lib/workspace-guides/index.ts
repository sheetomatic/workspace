import { HOME_GUIDE } from "./modules/home";
import { FMS_GUIDE } from "./modules/fms";
import { TASKS_GUIDE } from "./modules/tasks";
import { HR_ATTENDANCE_GUIDE } from "./modules/hr-attendance";
import { EM_GUIDE } from "./modules/em";
import {
  CHECKLISTS_GUIDE,
  IMS_GUIDE,
  LEADS_GUIDE,
} from "./modules/stubs";
import type {
  WorkspaceGuide,
  WorkspaceGuideModuleId,
} from "./types";

export type {
  GuideHighlight,
  GuideSnapshot,
  GuideStep,
  WorkspaceGuide,
  WorkspaceGuideModuleId,
} from "./types";

/** Phase-1 guides with full snapshots first; stubs expand later. */
export const WORKSPACE_GUIDES: WorkspaceGuide[] = [
  HOME_GUIDE,
  FMS_GUIDE,
  TASKS_GUIDE,
  HR_ATTENDANCE_GUIDE,
  EM_GUIDE,
  IMS_GUIDE,
  CHECKLISTS_GUIDE,
  LEADS_GUIDE,
];

const BY_ID = Object.fromEntries(
  WORKSPACE_GUIDES.map((g) => [g.id, g]),
) as Record<WorkspaceGuideModuleId, WorkspaceGuide>;

export function getWorkspaceGuide(
  id: WorkspaceGuideModuleId | string | null | undefined,
): WorkspaceGuide | null {
  if (!id) return null;
  return BY_ID[id as WorkspaceGuideModuleId] ?? null;
}

/**
 * Longest pathPrefix wins so `/app/hr/attendance` beats `/app` home.
 * Exact `/app` (home) only matches when path is `/app` or `/app/`.
 */
export function resolveGuideForPathname(pathname: string): WorkspaceGuide | null {
  const path = (pathname.split("?")[0] || "/").replace(/\/$/, "") || "/";

  if (path === "/app") {
    return HOME_GUIDE;
  }

  let best: WorkspaceGuide | null = null;
  let bestLen = 0;
  for (const guide of WORKSPACE_GUIDES) {
    if (guide.id === "home") continue;
    for (const prefix of guide.pathPrefixes) {
      const normalized = prefix.replace(/\/$/, "");
      if (
        (path === normalized || path.startsWith(`${normalized}/`)) &&
        normalized.length > bestLen
      ) {
        best = guide;
        bestLen = normalized.length;
      }
    }
  }
  return best;
}

/** Lightweight keyword match for “how do I…” without calling the model. */
export function matchGuideFromQuery(query: string): WorkspaceGuide | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  let best: WorkspaceGuide | null = null;
  let bestScore = 0;
  for (const guide of WORKSPACE_GUIDES) {
    let score = 0;
    for (const kw of guide.keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += kw.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = guide;
    }
  }
  return bestScore > 0 ? best : null;
}

export function listGuidesForAiPrompt(): string {
  return WORKSPACE_GUIDES.map((g) => {
    const steps = g.steps
      .map((s, i) => `  ${i + 1}. [${s.id}] ${s.title}: ${s.body}`)
      .join("\n");
    const tips = g.tips?.length
      ? `\n  Tips: ${g.tips.join(" | ")}`
      : "";
    return [
      `## ${g.id} — ${g.title}`,
      `Summary: ${g.summary}`,
      `Open in app: ${g.primaryHref}`,
      `Has snapshots: ${g.snapshots.length > 0 ? "yes" : "no"}`,
      `Steps:\n${steps}${tips}`,
    ].join("\n");
  }).join("\n\n");
}
