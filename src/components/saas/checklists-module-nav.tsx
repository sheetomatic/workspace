"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CheckSquare,
  ClipboardCheck,
  LayoutList,
  Settings2,
  Users,
  Wrench,
} from "lucide-react";

function navIsActive(pathname: string, href: string, team: string | null) {
  if (href === "/app/checklists") {
    return pathname === "/app/checklists" && !team;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ChecklistsModuleNav({ isManager }: { isManager: boolean }) {
  const pathname = usePathname();
  const team = useSearchParams().get("team");

  const items = [
    {
      href: "/app/checklists",
      label: "All checklists",
      icon: LayoutList,
      visible: true,
      description: "Every department",
    },
    {
      href: "/app/checklists/accounts",
      label: "Accounts Check List",
      icon: ClipboardCheck,
      visible: true,
      description: "GST, recon & collections",
    },
    {
      href: "/app/checklists/hr",
      label: "HR Check List",
      icon: Users,
      visible: true,
      description: "Onboarding & attendance",
    },
    {
      href: "/app/checklists/maintenance",
      label: "Maintenance (Machine)",
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
          <span>Any department</span>
        </div>
      </div>
      <ul className="ws-module-subnav-list">
        {items.map((item) => {
          const Icon = item.icon;
          const active = navIsActive(pathname, item.href, team);
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
