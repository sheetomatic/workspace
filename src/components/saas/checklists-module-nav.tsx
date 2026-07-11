"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  ClipboardCheck,
  Settings2,
  Users,
  Wrench,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { canCreateTasks } from "@/lib/tasks";

function navIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ChecklistsModuleNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const isManager = canCreateTasks(user.role);

  const items = [
    {
      href: "/app/checklists/accounts",
      label: "Accounts",
      icon: ClipboardCheck,
      visible: true,
      description: "GST, recon & collections",
    },
    {
      href: "/app/checklists/hr",
      label: "HR",
      icon: Users,
      visible: true,
      description: "Onboarding & attendance",
    },
    {
      href: "/app/checklists/maintenance",
      label: "Maintenance",
      icon: Wrench,
      visible: true,
      description: "Plant & PM rounds",
    },
    {
      href: "/app/checklists/setup",
      label: "Setup",
      icon: Settings2,
      visible: isManager,
      description: "Templates & schedules",
    },
  ].filter((item) => item.visible);

  return (
    <nav
      className="ws-module-subnav ws-checklists-subnav ws-pc-subnav"
      aria-label="Check List navigation"
    >
      <div className="ws-module-subnav-brand">
        <span className="ws-checklists-subnav-brand-icon" aria-hidden>
          <CheckSquare size={16} strokeWidth={1.75} />
        </span>
        <div>
          <strong>Check List</strong>
          <span>Department SOP checklists</span>
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
                <Icon size={16} aria-hidden strokeWidth={1.75} />
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
