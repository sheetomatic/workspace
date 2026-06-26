"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  ClipboardList,
  Radar,
  Settings2,
  BarChart3,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { canCreateTasks } from "@/lib/tasks";

function navIsActive(pathname: string, href: string) {
  if (href === "/app/checklists") {
    return pathname === "/app/checklists";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ChecklistsModuleNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const isManager = canCreateTasks(user.role);

  const items = [
    {
      href: "/app/checklists/my-tasks",
      label: "My PC tasks",
      icon: ClipboardList,
      visible: true,
      description: "Complete assigned work",
    },
    {
      href: "/app/checklists",
      label: "PC monitor",
      icon: Radar,
      visible: isManager,
      description: "EA, FMS, and checklist",
    },
    {
      href: "/app/checklists/scores",
      label: "MIS scores",
      icon: BarChart3,
      visible: isManager,
      description: "PC planned vs actual",
    },
    {
      href: "/app/checklists/setup",
      label: "Setup",
      icon: Settings2,
      visible: isManager,
      description: "AI checklist templates",
    },
  ].filter((item) => item.visible);

  return (
    <nav className="ws-module-subnav ws-checklists-subnav ws-pc-subnav" aria-label="PC navigation">
      <div className="ws-module-subnav-brand">
        <CheckSquare size={18} aria-hidden />
        <div>
          <strong>PC</strong>
          <span>AI process checklist</span>
        </div>
      </div>
      <ul className="ws-module-subnav-list">
        {items.map((item) => {
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
                  <small>{item.description}</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
