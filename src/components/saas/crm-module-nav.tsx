"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  FolderKanban,
  GraduationCap,
  Megaphone,
  Users,
} from "lucide-react";
import type { CrmModuleNavCounts } from "@/lib/leads/crm-module-stats-types";
import { formatCrmNavValue } from "@/lib/leads/crm-nav-format";

type NavItem = {
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

export function CrmModuleNav({ counts }: { counts: CrmModuleNavCounts }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      href: "/app/leads",
      label: "Leads",
      icon: Users,
      count: counts.leads,
      matchExact: true,
    },
    {
      href: "/app/leads/meetings",
      label: "Meetings",
      icon: CalendarDays,
      count: counts.meetings,
    },
    {
      href: "/app/leads/quotations",
      label: "Quotations",
      icon: ClipboardList,
      count: counts.quotations,
      valueLabel: formatCrmNavValue(counts.quotationValue),
    },
    {
      href: "/app/leads/payments",
      label: "Payments",
      icon: CreditCard,
      count: counts.payments,
      valueLabel: formatCrmNavValue(counts.paymentValue),
    },
    {
      href: "/app/leads/projects",
      label: "Projects",
      icon: FolderKanban,
      count: counts.projectsRunning,
      valueLabel: `${counts.projectsDelivered} delivered`,
    },
    {
      href: "/app/leads/training",
      label: "Training",
      icon: GraduationCap,
      count: counts.training,
    },
  ];

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
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.matchExact);
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
                  <small>
                    {item.count.toLocaleString("en-IN")}
                    {item.valueLabel ? ` · ${item.valueLabel}` : ""}
                  </small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
