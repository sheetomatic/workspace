"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, ListChecks, Radar } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { canCreateTasks } from "@/lib/tasks";

function navIsActive(pathname: string, href: string) {
  if (href === "/app/pc/today") {
    return pathname === "/app/pc/today";
  }
  if (href === "/app/pc/all") {
    return pathname === "/app/pc/all";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
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
      description: "Due now — EA & FMS",
    },
    {
      href: "/app/pc/all",
      label: "All",
      icon: Radar,
      visible: isManager,
      description: "Full team follow-up queue",
    },
  ].filter((item) => item.visible);

  return (
    <nav className="ws-module-subnav ws-pc-subnav" aria-label="PC navigation">
      <div className="ws-module-subnav-brand">
        <ListChecks size={18} aria-hidden />
        <div>
          <strong>PC</strong>
          <span>Tasks & follow-ups</span>
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
