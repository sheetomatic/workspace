"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  PlusCircle,
  ListTodo,
  Sparkles,
  Users,
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
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TasksModuleNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const isManager = canCreateTasks(user.role);
  const showEmReady = canAccessEmReady(user);

  const items: NavItem[] = [
    {
      href: "/app/tasks/my-work",
      label: "My work",
      icon: ClipboardList,
      visible: true,
      description: "Tasks assigned to you",
    },
    {
      href: "/app/tasks",
      label: "Team board",
      icon: Users,
      visible: isManager,
      description: "All team tasks & workload",
    },
    {
      href: "/app/tasks/create",
      label: "Create task",
      icon: PlusCircle,
      visible: isManager,
      description: "New task only",
    },
    {
      href: "/app/tasks/scores",
      label: "MIS scores",
      icon: BarChart3,
      visible: isManager,
      description: "Task performance",
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
    <nav className="ws-module-subnav ws-tasks-subnav" aria-label="EA navigation">
      <div className="ws-module-subnav-brand">
        <ListTodo size={18} aria-hidden />
        <div>
          <strong>EA</strong>
          <span>Delegation & proof</span>
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
