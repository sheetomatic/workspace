import type { WorkspaceGuide } from "../types";

export const EM_GUIDE: WorkspaceGuide = {
  id: "em",
  title: "EM Ready",
  summary:
    "Executive meeting board with period filters and person-wise KRA/KPI as deficit % across Tasks, FMS, checklists, and IMS — open and start, zero prep.",
  pathPrefixes: ["/app/em"],
  keywords: [
    "em",
    "em ready",
    "executive meeting",
    "weekly review",
    "kra",
    "kpi",
    "deficit",
    "mis",
  ],
  primaryHref: "/app/em",
  snapshots: [
    {
      id: "em-ready",
      src: "/workspace-guides/em-ready.png",
      alt: "Sheetomatic EM Ready board with deficit callouts",
      highlights: [
        {
          id: "period",
          x: 8,
          y: 14,
          w: 36,
          h: 12,
          shape: "circle",
          label: "1",
          selector: "[data-guide='em-period']",
        },
        {
          id: "person-row",
          x: 8,
          y: 36,
          w: 84,
          h: 16,
          shape: "rect",
          label: "2",
          selector: "[data-guide='em-person']",
        },
        {
          id: "exceptions",
          x: 8,
          y: 58,
          w: 50,
          h: 28,
          shape: "circle",
          label: "3",
          selector: "[data-guide='em-exceptions']",
        },
      ],
    },
  ],
  steps: [
    {
      id: "period",
      title: "Pick the EM period",
      body: "Choose this week, month, or a custom range. The board recomputes exceptions and deficits for that window.",
      highlightIds: ["period"],
      snapshotId: "em-ready",
    },
    {
      id: "deficit",
      title: "Read person-wise deficit",
      body: "Each person shows module deficits (Tasks, FMS, …) and a total — e.g. -20% means gaps/delays, not “80% complete”. Discuss ownership with data.",
      highlightIds: ["person-row"],
      snapshotId: "em-ready",
    },
    {
      id: "exceptions",
      title: "Work exceptions only",
      body: "Drill overdue, delayed, and pending items from the exceptions list into FMS or Tasks. Do not rebuild slides — the board is the prep.",
      highlightIds: ["exceptions"],
      snapshotId: "em-ready",
    },
  ],
  tips: [
    "Managers and above typically access EM Ready; others use module reports.",
    "Keep FMS and Tasks current all week so Monday EM needs zero spreadsheet merge.",
  ],
};
