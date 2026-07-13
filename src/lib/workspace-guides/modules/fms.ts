import type { WorkspaceGuide } from "../types";

export const FMS_GUIDE: WorkspaceGuide = {
  id: "fms",
  title: "FMS — Flow Management System",
  summary:
    "FMS tracks each job through process stops with Planned | Actual | Status | Delay. Use Live pipelines for the tracker, My stops to complete your steps with proof.",
  pathPrefixes: ["/app/fms"],
  keywords: [
    "fms",
    "flow",
    "pipeline",
    "live pipelines",
    "my stops",
    "process",
    "sla",
    "flowchart",
  ],
  primaryHref: "/app/fms/lines",
  snapshots: [
    {
      id: "fms-list",
      src: "/workspace-guides/fms-list.png",
      alt: "Sheetomatic FMS live pipelines list with callouts",
      highlights: [
        {
          id: "new-fms",
          x: 72,
          y: 6,
          w: 22,
          h: 12,
          shape: "circle",
          label: "1",
          selector: "[data-guide='fms-new']",
        },
        {
          id: "pipeline-row",
          x: 8,
          y: 32,
          w: 84,
          h: 18,
          shape: "rect",
          label: "2",
          selector: "[data-guide='fms-row']",
        },
        {
          id: "status-col",
          x: 68,
          y: 32,
          w: 22,
          h: 40,
          shape: "circle",
          label: "3",
          selector: "[data-guide='fms-status']",
        },
      ],
    },
  ],
  steps: [
    {
      id: "open-pipelines",
      title: "Open Live pipelines",
      body: "Go to FMS → Live pipelines. Metrics show Active, On track, Delayed, and Pending. Search by SO# or reference when you have many jobs.",
      highlightIds: ["pipeline-row"],
      snapshotId: "fms-list",
    },
    {
      id: "open-row",
      title: "Open a journey",
      body: "Click any pipeline row. The instance timeline shows each stop with Planned, Actual, Status, and Time Delay so ownership is clear — no blame game.",
      highlightIds: ["pipeline-row", "status-col"],
      snapshotId: "fms-list",
    },
    {
      id: "complete-stop",
      title: "Complete your stop",
      body: "Staff use My stops for a 2-tap complete: mark done, upload proof if required, add notes. SLA breach drives internal WhatsApp alerts to staff only.",
      highlightIds: ["status-col"],
      snapshotId: "fms-list",
    },
    {
      id: "setup",
      title: "Add or design an FMS",
      body: "Managers design templates under FMS setup (Who / How / When / proof / SLA). Orgs can run multiple split FMS templates — Order, Sample, Dispatch, Collection — without 300 Sheets.",
      highlightIds: ["new-fms"],
      snapshotId: "fms-list",
    },
  ],
  tips: [
    "One department, one process per FMS template.",
    "Delayed stops roll into EM Ready and person-wise KRA deficit.",
  ],
};
