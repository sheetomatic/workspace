"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type TaskStatsSummary = {
  pending: number;
  inProgress: number;
  completedToday: number;
  overdue: number;
};

type StatKey = "pending" | "progress" | "done" | "overdue";

function buildStatParams(
  key: StatKey,
  current: URLSearchParams,
  toggleOff: boolean,
) {
  const next = new URLSearchParams(current.toString());
  next.delete("page");

  if (toggleOff) {
    next.delete("status");
    next.delete("overdue");
    next.delete("doneToday");
    return next;
  }

  next.delete("status");
  next.delete("overdue");
  next.delete("doneToday");

  switch (key) {
    case "pending":
      next.set("status", "PENDING");
      break;
    case "progress":
      next.set("status", "IN_PROGRESS");
      break;
    case "done":
      next.set("doneToday", "1");
      break;
    case "overdue":
      next.set("overdue", "1");
      break;
  }

  return next;
}

function statHref(key: StatKey, current: URLSearchParams, active: boolean) {
  const params = buildStatParams(key, current, active);
  const query = params.toString();
  return query ? `/app/tasks?${query}#execution-queue` : "/app/tasks#execution-queue";
}

function isStatActive(key: StatKey, params: URLSearchParams) {
  const status = params.get("status");
  const overdue = params.get("overdue");
  const doneToday = params.get("doneToday");

  switch (key) {
    case "pending":
      return status === "PENDING" && overdue !== "1" && doneToday !== "1";
    case "progress":
      return status === "IN_PROGRESS" && overdue !== "1" && doneToday !== "1";
    case "done":
      return doneToday === "1";
    case "overdue":
      return overdue === "1";
  }
}

function scrollToQueue() {
  window.requestAnimationFrame(() => {
    document.getElementById("execution-queue")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

export function TaskStatsBar({ stats }: { stats: TaskStatsSummary }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const handleStatClick = useCallback(
    (key: StatKey, active: boolean) => {
      const params = buildStatParams(key, searchParams, active);
      const query = params.toString();
      const href = query
        ? `${pathname}?${query}#execution-queue`
        : `${pathname}#execution-queue`;
      router.push(href, { scroll: false });
      scrollToQueue();
    },
    [pathname, router, searchParams],
  );

  const cards = [
    {
      key: "pending" as const,
      label: "Pending",
      value: stats.pending,
      className: "ws-stat-pending",
    },
    {
      key: "progress" as const,
      label: "In progress",
      value: stats.inProgress,
      className: "ws-stat-progress",
    },
    {
      key: "done" as const,
      label: "Done today",
      value: stats.completedToday,
      className: "ws-stat-done",
    },
    {
      key: "overdue" as const,
      label: "Overdue",
      value: stats.overdue,
      className: "ws-stat-overdue",
    },
  ];

  return (
    <div className="ws-task-stats" role="group" aria-label="Task summary filters">
      {cards.map((card) => {
        const active = isStatActive(card.key, searchParams);
        return (
          <Link
            key={card.key}
            aria-current={active ? "true" : undefined}
            className={`ws-stat-card ws-stat-card-link ${card.className}${active ? " is-active" : ""}`}
            href={statHref(card.key, searchParams, active)}
            onClick={(event) => {
              event.preventDefault();
              handleStatClick(card.key, active);
            }}
          >
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <span className="ws-stat-card-hint">
              {active ? "Tap to clear" : "Tap to filter"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
