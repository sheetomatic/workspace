import type { WorkspaceGuide } from "../types";

export const HOME_GUIDE: WorkspaceGuide = {
  id: "home",
  title: "Home dashboard",
  summary:
    "Your Workspace home shows module widgets so you can jump to exceptions — FMS delays, task deficits, IMS reorder, and EM Ready — without prep.",
  pathPrefixes: ["/app"],
  keywords: [
    "home",
    "dashboard",
    "widgets",
    "workspace home",
    "hello",
    "overview",
  ],
  primaryHref: "/app",
  snapshots: [
    {
      id: "home-main",
      src: "/workspace-guides/home-dashboard.png",
      alt: "Sheetomatic Workspace home dashboard with module widgets",
      highlights: [
        {
          id: "em-widget",
          x: 58,
          y: 18,
          w: 28,
          h: 28,
          shape: "circle",
          label: "1",
          selector: "[data-guide='em-widget']",
        },
        {
          id: "tasks-deficit",
          x: 28,
          y: 48,
          w: 26,
          h: 26,
          shape: "circle",
          label: "2",
          selector: "[data-guide='tasks-widget']",
        },
        {
          id: "fms-exceptions",
          x: 8,
          y: 48,
          w: 26,
          h: 26,
          shape: "circle",
          label: "3",
          selector: "[data-guide='fms-widget']",
        },
      ],
    },
  ],
  steps: [
    {
      id: "scan",
      title: "Scan exceptions first",
      body: "Open Home after login. Red or alert footers on widgets are what matter for the weekly review — not the full row dump.",
      highlightIds: ["fms-exceptions", "tasks-deficit"],
      snapshotId: "home-main",
    },
    {
      id: "em",
      title: "Jump to EM Ready",
      body: "When you are ready for the executive meeting, open the EM Ready widget. Period filters and person-wise deficit % are already computed.",
      highlightIds: ["em-widget"],
      snapshotId: "home-main",
    },
    {
      id: "drill",
      title: "Drill into a module",
      body: "Tap any widget to open that module (FMS, Tasks, IMS, Checklists). Complete the stop or task there — Home will refresh on your next visit.",
      highlightIds: ["fms-exceptions", "tasks-deficit"],
      snapshotId: "home-main",
    },
  ],
  tips: [
    "Deficit % is penalty-style (e.g. -20%), not “% done”.",
    "Use Customize in Settings to show only the modules your org uses.",
  ],
};
