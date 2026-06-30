"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  ListTodo,
  Sparkles,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { canCreateTasks } from "@/lib/tasks";
import { canAccessEmReady } from "@/lib/em/em-access";

type NavItem = {
  href: string;
  label: string;
  icon: typeof ListTodo;
  visible: boolean;
  description?: string;
};

function navIsActive(pathname: string, href: string) {
  if (href === "/app/tasks") {
    return pathname === "/app/tasks";
  }
  if (href === "/app/tasks/today") {
    return pathname === "/app/tasks/today";
  }
  if (href === "/app/tasks/all") {
    return pathname === "/app/tasks/all";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TasksModuleNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const isManager = canCreateTasks(user.role);
  const showEmReady = canAccessEmReady(user);

  const items: NavItem[] = [
    {
      href: "/app/tasks/today",
      label: "Today",
      icon: ClipboardList,
      visible: true,
      description: "Due today & overdue",
    },
    {
      href: "/app/tasks/all",
      label: "All",
      icon: ListChecks,
      visible: true,
      description: isManager ? "Team task queue" : "Full active queue",
    },
    {
      href: "/app/tasks",
      label: "Tasks Management",
      icon: LayoutDashboard,
      visible: isManager,
      description: "Charts, scores & summary",
    },
    {
      href: "/app/tasks/create",
      label: "Add task",
      icon: PlusCircle,
      visible: isManager,
      description: "Create and assign",
    },
    {
      href: "/app/tasks/scores",
      label: "Reports",
      icon: BarChart3,
      visible: isManager,
      description: "MIS performance",
    },
    {
      href: "/app/tasks#execution-queue",
      label: "Task list",
      icon: ListChecks,
      visible: isManager,
      description: "Full team queue",
    },
    {
      href: "/app/em",
      label: "EM Ready",
      icon: Sparkles,
      visible: showEmReady,
      description: "Weekly executive meeting",
    },
  ];

  const visibleItems = items.filter((item) => item.visible);

  return (
    <nav className="ws-module-subnav ws-tasks-subnav" aria-label="Tasks navigation">
      <div className="ws-module-subnav-brand">
        <ListTodo size={18} aria-hidden />
        <div>
          <strong>Task Delegation</strong>
          <span>Tasks Management</span>
        </div>
      </div>
      <ul className="ws-module-subnav-list">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = navIsActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`ws-module-subnav-link${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} aria-hidden />
                <span>
                  {item.label}
                  {item.description ? (
                    <small>{item.description}</small>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
