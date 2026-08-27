import { describe, expect, it } from "vitest";
import {
  mobileWorkspaceNavItems,
  mobileWorkspaceNavSplit,
  navIsActive,
  type WorkspaceNavItem,
} from "@/lib/workspace-navigation";
import type { SessionUser } from "@/lib/auth";
import { Briefcase, CheckSquare, GitBranch, LayoutDashboard, Users } from "lucide-react";

describe("mobileWorkspaceNavItems", () => {
  it("expands BCI into FMS/Check List and keeps HRMS labeled HRMS", () => {
    const items: WorkspaceNavItem[] = [
      {
        href: "/app/fms",
        label: "BCI",
        icon: Briefcase,
        children: [
          {
            id: "fms",
            href: "/app/fms",
            label: "FMS",
            icon: GitBranch,
            matchPrefix: "/app/fms",
          },
          {
            id: "checklists",
            href: "/app/checklists",
            label: "Check List",
            icon: CheckSquare,
            matchPrefix: "/app/checklists",
          },
        ],
      },
      {
        id: "dept-hr",
        href: "/app/hr",
        label: "HRMS",
        icon: Users,
        matchPrefix: "/app/hr",
        children: [
          {
            href: "/app/hr",
            label: "HR Dashboard",
            icon: Users,
            matchPrefix: "/app/hr",
          },
        ],
      },
      {
        id: "tasks",
        href: "/app/tasks",
        label: "Tasks Management",
        icon: LayoutDashboard,
        matchPrefix: "/app/tasks",
      },
    ];

    const mobile = mobileWorkspaceNavItems(items);
    expect(mobile.map((item) => item.label)).toEqual([
      "HRMS",
      "Tasks",
      "FMS",
      "Check List",
    ]);
    expect(mobile.every((item) => item.label !== "BCI")).toBe(true);
    expect(mobile[0]?.matchPrefix).toBe("/app/hr");
  });

  it("keeps four quick items and moves the rest under More", () => {
    const items: WorkspaceNavItem[] = [
      { id: "dept-hr", href: "/app/hr", label: "HRMS", icon: Users, matchPrefix: "/app/hr" },
      { id: "tasks", href: "/app/tasks", label: "Tasks Management", icon: LayoutDashboard, matchPrefix: "/app/tasks" },
      { id: "fms", href: "/app/fms", label: "FMS", icon: GitBranch, matchPrefix: "/app/fms" },
      { id: "checklists", href: "/app/checklists", label: "Check List", icon: CheckSquare, matchPrefix: "/app/checklists" },
      { id: "leads", href: "/app/leads", label: "CRM", icon: Briefcase, matchPrefix: "/app/leads" },
      { id: "em", href: "/app/em", label: "EM Ready", icon: Briefcase, matchPrefix: "/app/em" },
      { id: "reports", href: "/app/reports", label: "Reports", icon: Briefcase, matchPrefix: "/app/reports" },
    ];

    const { primary, more } = mobileWorkspaceNavSplit(items);
    expect(primary.map((item) => item.label)).toEqual([
      "HRMS",
      "Tasks",
      "FMS",
      "CRM",
    ]);
    // Everything beyond the four quick items stays reachable via More.
    expect(more.map((item) => item.label)).toEqual([
      "EM Ready",
      "Check List",
      "Reports",
    ]);
  });

  it("marks HRMS active on HR Check List path", () => {
    expect(navIsActive("/app/checklists/hr", "/app/hr", "/app/hr")).toBe(true);
    expect(
      navIsActive("/app/checklists/hr", "/app/checklists", "/app/checklists"),
    ).toBe(false);
  });
});
