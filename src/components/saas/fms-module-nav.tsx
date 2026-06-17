"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Radar,
  Settings2,
  TrainFront,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { canApproveFmsFlow, canSubmitFmsFlow } from "@/lib/fms/access";
import { hasMinimumRole } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: typeof TrainFront;
  visible: boolean;
  description?: string;
};

function navIsActive(pathname: string, href: string) {
  if (href === "/app/fms") {
    return pathname === "/app/fms";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FmsModuleNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const isManager = hasMinimumRole(user.role, "MANAGER");
  const canSetup = canSubmitFmsFlow(user.role) || canApproveFmsFlow(user.role);

  const items: NavItem[] = [
    {
      href: "/app/fms/my-stops",
      label: "My queue",
      icon: TrainFront,
      visible: true,
      description: "Work waiting for you",
    },
    {
      href: "/app/fms/lines",
      label: "Live pipelines",
      icon: LayoutDashboard,
      visible: isManager,
      description: "All active workflows",
    },
    {
      href: "/app/fms/ops",
      label: "Ops monitor",
      icon: Radar,
      visible: isManager,
      description: "Overdue and unassigned",
    },
    {
      href: "/app/fms/scores",
      label: "MIS scores",
      icon: ListChecks,
      visible: isManager,
      description: "On-time performance by line",
    },
    {
      href: "/app/fms/setup",
      label: "Setup",
      icon: Settings2,
      visible: canSetup,
      description: "Forms, flowcharts, workflows",
    },
  ];

  const visibleItems = items.filter((item) => item.visible);

  return (
    <nav className="ws-module-subnav ws-fms-subnav" aria-label="FMS navigation">
      <div className="ws-module-subnav-brand">
        <GitBranch size={18} aria-hidden />
        <div>
          <strong>FMS</strong>
          <span>Flow management</span>
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
