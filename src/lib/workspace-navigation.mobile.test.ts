import { describe, expect, it } from "vitest";
import {
  mobileWorkspaceNavItems,
  navIsActive,
  type WorkspaceNavItem,
} from "@/lib/workspace-navigation";
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

  it("marks HRMS active on HR Check List path", () => {
    expect(navIsActive("/app/checklists/hr", "/app/hr", "/app/hr")).toBe(true);
    expect(
      navIsActive("/app/checklists/hr", "/app/checklists", "/app/checklists"),
    ).toBe(false);
  });
});
