import type { WorkspaceGuide } from "../types";

export const HR_ATTENDANCE_GUIDE: WorkspaceGuide = {
  id: "hr-attendance",
  title: "HR — Attendance",
  summary:
    "Punch check-in / check-out for today, review site stats, and (managers) mark days or scan the month calendar. Geo-fence rules come from Team settings — not this screen’s schema.",
  pathPrefixes: ["/app/hr/attendance"],
  keywords: [
    "attendance",
    "check in",
    "check out",
    "punch",
    "hr attendance",
    "geo-fence",
    "present",
  ],
  primaryHref: "/app/hr/attendance",
  snapshots: [
    {
      id: "hr-attendance",
      src: "/workspace-guides/hr-attendance.png",
      alt: "Sheetomatic HR attendance punch panel with callouts",
      highlights: [
        {
          id: "check-in",
          x: 12,
          y: 28,
          w: 22,
          h: 18,
          shape: "circle",
          label: "1",
          selector: "[data-guide='hr-check-in']",
        },
        {
          id: "check-out",
          x: 38,
          y: 28,
          w: 22,
          h: 18,
          shape: "circle",
          label: "2",
          selector: "[data-guide='hr-check-out']",
        },
        {
          id: "today-stats",
          x: 68,
          y: 12,
          w: 24,
          h: 16,
          shape: "circle",
          label: "3",
          selector: "[data-guide='hr-stats']",
        },
      ],
    },
  ],
  steps: [
    {
      id: "punch-in",
      title: "Check in",
      body: "Open HR → Attendance. Use Check in on the punch panel for today. If geo-fence is required for your membership, allow location when prompted.",
      highlightIds: ["check-in"],
      snapshotId: "hr-attendance",
    },
    {
      id: "punch-out",
      title: "Check out",
      body: "At end of day, Check out from the same panel. Your row updates in today’s attendance table.",
      highlightIds: ["check-out"],
      snapshotId: "hr-attendance",
    },
    {
      id: "review",
      title: "Review sites & month",
      body: "Filter by site if your org has multiple workplaces. Managers can mark a day for someone and use the month calendar for Present / Leave / Holiday overview.",
      highlightIds: ["today-stats"],
      snapshotId: "hr-attendance",
    },
  ],
  tips: [
    "Workplace locations and per-member fence rules are under Team → member / workplace settings.",
    "Leave requests live under HR → Leave — not on the punch panel.",
  ],
};
