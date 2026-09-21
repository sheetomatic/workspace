"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CalendarRange, ClipboardCheck, ListChecks, Radar } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { canCreateTasks } from "@/lib/tasks";

function navIsActive(pathname: string, href: string) {
  return pathname === href;
}

export function PcModuleNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const isManager = canCreateTasks(user.role);

  const items = [
    {
      href: "/app/pc/today",
      label: "Today",
      icon: ClipboardCheck,
      visible: true,
      description: "Due now + overdue",
    },
    {
      href: "/app/pc/week",
      label: "This week",
      icon: CalendarRange,
      visible: true,
      description: "Monday–Sunday chase",
    },
    {
      href: "/app/pc/month",
      label: "This month",
      icon: CalendarDays,
      visible: true,
      description: "Month-wise doer jobs",
    },
    {
      href: "/app/pc/all",
      label: "All",
      icon: Radar,
      visible: isManager,
      description: "Full team queue",
    },
  ].filter((item) => item.visible);

  return (
    <nav className="ws-module-subnav ws-pc-subnav" aria-label="PC jobs">
      <div className="ws-module-subnav-brand">
        <ListChecks size={18} aria-hidden />
        <div>
          <strong>PC jobs</strong>
          <span>Process Coordinator</span>
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
