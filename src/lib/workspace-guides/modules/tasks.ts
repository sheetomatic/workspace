import type { WorkspaceGuide } from "../types";

export const TASKS_GUIDE: WorkspaceGuide = {
  id: "tasks",
  title: "Tasks",
  summary:
    "Assign, track, and verify work. Today / My work for assignees; Tasks Management for managers. Overdue and late completions feed EM deficit %.",
  pathPrefixes: ["/app/tasks"],
  keywords: [
    "task",
    "tasks",
    "delegation",
    "assign",
    "my work",
    "today",
    "overdue",
  ],
  primaryHref: "/app/tasks",
  snapshots: [
    {
      id: "tasks-main",
      src: "/workspace-guides/tasks.png",
      alt: "Sheetomatic Tasks Management with callouts",
      highlights: [
        {
          id: "new-task",
          x: 78,
          y: 5,
          w: 18,
          h: 12,
          shape: "circle",
          label: "1",
          selector: "[data-guide='task-new']",
        },
        {
          id: "overdue-metric",
          x: 28,
          y: 18,
          w: 18,
          h: 16,
          shape: "circle",
          label: "2",
          selector: "[data-guide='task-overdue']",
        },
        {
          id: "task-row",
          x: 6,
          y: 42,
          w: 88,
          h: 14,
          shape: "rect",
          label: "3",
          selector: "[data-guide='task-row']",
        },
      ],
    },
  ],
  steps: [
    {
      id: "create",
      title: "Create a task",
      body: "Managers click New task (or use Sheetomatic AI voice/parse where enabled). Set assignee, due date, and optional verifier.",
      highlightIds: ["new-task"],
      snapshotId: "tasks-main",
    },
    {
      id: "filter",
      title: "Filter exceptions",
      body: "Use Overdue / Done today / status filters. Exception cards on the toolbar jump straight to what needs follow-up before EM.",
      highlightIds: ["overdue-metric"],
      snapshotId: "tasks-main",
    },
    {
      id: "complete",
      title: "Complete and verify",
      body: "Assignees update status from My work or Today. Verifiers confirm completion. Late or still-open items add deficit on EM — not “80% done” framing.",
      highlightIds: ["task-row"],
      snapshotId: "tasks-main",
    },
  ],
  tips: [
    "Staff without create rights land on Today / My work automatically.",
    "Link EM Ready from the toolbar when preparing the weekly review.",
  ],
};
