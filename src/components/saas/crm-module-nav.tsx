"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  FolderKanban,
  GraduationCap,
  GripVertical,
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
  reorderCrmModuleIds,
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const startIdsRef = useRef<string[] | null>(null);
  const idsRef = useRef<string[]>([]);
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
  const visibleItems = allItems.filter((item) => !allowed || allowed.has(item.id));
  const items = applyCrmModuleOrder(visibleItems, order);
  idsRef.current = items.map((item) => item.id);

  function persist(next: string[]) {
    setOrder(next);
    startTransition(() => {
      void saveCrmModuleOrder(next);
    });
  }

  function moveOver(overId: string) {
    const fromId = dragIdRef.current;
    if (!fromId || fromId === overId) {
      return;
    }
    setOrder((current) =>
      reorderCrmModuleIds(
        applyCrmModuleOrder(
          visibleItems.map((item) => ({ id: item.id })),
          current,
        ).map((item) => item.id),
        fromId,
        overId,
      ),
    );
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragIdRef.current = id;
    startIdsRef.current = idsRef.current;
    setDraggingId(id);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragIdRef.current) {
      return;
    }
    const node = document.elementFromPoint(event.clientX, event.clientY);
    const row = node?.closest("[data-crm-module]");
    const overId = row instanceof HTMLElement ? row.dataset.crmModule : undefined;
    if (overId) {
      moveOver(overId);
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragIdRef.current) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const next = idsRef.current;
    const started = startIdsRef.current;
    dragIdRef.current = null;
    startIdsRef.current = null;
    setDraggingId(null);
    if (started && started.join("\0") !== next.join("\0")) {
      persist(next);
    }
  }

  return (
    <nav className="ws-module-subnav crm-module-subnav" aria-label="CRM modules">
      <div className="ws-module-subnav-brand">
        <Megaphone size={18} aria-hidden />
        <div>
          <strong>CRM</strong>
          <span>Drag modules to reorder</span>
        </div>
      </div>
      <ul className="ws-module-subnav-list">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.matchExact);
          const dragging = draggingId === item.id;
          return (
            <li
              key={item.href}
              data-crm-module={item.id}
              className={`crm-module-subnav-row${dragging ? " is-dragging" : ""}`}
            >
              <button
                type="button"
                className="crm-module-subnav-handle"
                aria-label={`Drag ${item.label} to reorder`}
                onPointerDown={(event) => onPointerDown(event, item.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <GripVertical size={14} aria-hidden />
              </button>
              <Link
                href={item.href}
                prefetch={false}
                className={`ws-module-subnav-link${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                draggable={false}
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
