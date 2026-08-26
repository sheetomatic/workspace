"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CreditCard,
  FolderKanban,
  GraduationCap,
  History,
  ListTree,
  Megaphone,
  Users,
} from "lucide-react";
import { saveCrmModuleOrder } from "@/app/app/settings/nav-prefs-actions";
import type { CrmModuleNavCounts } from "@/lib/leads/crm-module-stats-types";
import { formatCrmNavValue } from "@/lib/leads/crm-nav-format";
import {
  applyCrmModuleOrder,
  moveCrmModuleId,
  type CrmSubModuleId,
} from "@/lib/crm/crm-sub-modules";
import "./crm-module-nav.css";

type NavItem = {
  id: CrmSubModuleId;
  href: string;
  label: string;
  icon: typeof Users;
  count: number;
  valueLabel?: string;
  matchExact?: boolean;
};

function isActive(pathname: string, href: string, matchExact?: boolean) {
  if (matchExact || href === "/app/leads") {
    return pathname === "/app/leads" || pathname === "/app/leads/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CrmModuleNav({
  counts,
  enabledSubModules,
  moduleOrder = [],
}: {
  counts: CrmModuleNavCounts;
  enabledSubModules?: CrmSubModuleId[] | null;
  moduleOrder?: string[];
}) {
  const pathname = usePathname();
  const [order, setOrder] = useState(moduleOrder);
  const [, startTransition] = useTransition();
  const allowed = enabledSubModules
    ? new Set(enabledSubModules)
    : null;

  const allItems: NavItem[] = [
    {
      id: "leads",
      href: "/app/leads",
      label: "Leads",
      icon: Users,
      count: counts.leads,
      matchExact: true,
    },
    {
      id: "nextTime",
      href: "/app/leads/next-time",
      label: "Next Time",
      icon: History,
      count: counts.nextTime,
    },
    {
      id: "meetings",
      href: "/app/leads/meetings",
      label: "Meetings",
      icon: CalendarDays,
      count: counts.meetings,
    },
    {
      id: "quotations",
      href: "/app/leads/quotations",
      label: "Quotations",
      icon: ClipboardList,
      count: counts.quotations,
      valueLabel: formatCrmNavValue(counts.quotationValue),
    },
    {
      id: "services",
      href: "/app/leads/services",
      label: "Service Master",
      icon: ListTree,
      count: counts.services,
    },
    {
      id: "payments",
      href: "/app/leads/payments",
      label: "Payments",
      icon: CreditCard,
      count: counts.payments,
      valueLabel: formatCrmNavValue(counts.paymentValue),
    },
    {
      id: "projects",
      href: "/app/leads/projects",
      label: "Projects",
      icon: FolderKanban,
      count: counts.projectsRunning,
      valueLabel: `${counts.projectsDelivered} delivered`,
    },
    {
      id: "training",
      href: "/app/leads/training",
      label: "Training",
      icon: GraduationCap,
      count: counts.training,
    },
  ];
  const items = applyCrmModuleOrder(
    allItems.filter((item) => !allowed || allowed.has(item.id)),
    order,
  );

  function move(id: CrmSubModuleId, direction: -1 | 1) {
    const next = moveCrmModuleId(
      items.map((item) => item.id),
      id,
      direction,
    );
    setOrder(next);
    startTransition(() => {
      void saveCrmModuleOrder(next);
    });
  }

  return (
    <nav className="ws-module-subnav crm-module-subnav" aria-label="CRM modules">
      <div className="ws-module-subnav-brand">
        <Megaphone size={18} aria-hidden />
        <div>
          <strong>CRM</strong>
          <span>Pipeline modules</span>
        </div>
      </div>
      <ul className="ws-module-subnav-list">
        {items.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.matchExact);
          return (
            <li key={item.href} className="crm-module-subnav-row">
              <Link
                href={item.href}
                prefetch={false}
                className={`ws-module-subnav-link${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} aria-hidden strokeWidth={1.75} />
                <span>
                  {item.label}
                  <small>
                    {item.count.toLocaleString("en-IN")}
                    {item.valueLabel ? ` · ${item.valueLabel}` : ""}
                  </small>
                </span>
              </Link>
              <div className="crm-module-subnav-move">
                <button
                  type="button"
                  aria-label={`Move ${item.label} up`}
                  disabled={index === 0}
                  onClick={() => move(item.id, -1)}
                >
                  <ChevronUp size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${item.label} down`}
                  disabled={index === items.length - 1}
                  onClick={() => move(item.id, 1)}
                >
                  <ChevronDown size={14} aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
