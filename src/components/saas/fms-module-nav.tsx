"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Settings2,
  TrainFront,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { canApproveFmsFlow, canSubmitFmsFlow } from "@/lib/fms/access";
import { hasMinimumRole } from "@/lib/permissions";
import { FmsInAppNotificationsBell } from "@/components/saas/fms-in-app-notifications-bell";

export type FmsQueueTemplateNav = {
  id: string;
  name: string;
  activeStops: number;
};

function navIsActive(pathname: string, href: string) {
  if (href === "/app/fms") {
    return pathname === "/app/fms";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FmsModuleNav({
  user,
  queueTemplates,
  unreadCount = 0,
  notifications = [],
}: {
  user: SessionUser;
  queueTemplates: FmsQueueTemplateNav[];
  unreadCount?: number;
  notifications?: Array<{
    id: string;
    title: string;
    body: string;
    href: string | null;
    createdAt: string;
  }>;
}) {
  const pathname = usePathname();
  const isManager = hasMinimumRole(user.role, "MANAGER");
  const canSetup = canSubmitFmsFlow(user.role) || canApproveFmsFlow(user.role);
  const [collapsed, setCollapsed] = useState(false);
  const [queueOpen, setQueueOpen] = useState(
    pathname.startsWith("/app/fms/my-stops"),
  );

  const queueActive = navIsActive(pathname, "/app/fms/my-stops");

  return (
    <nav
      className={`ws-module-subnav ws-fms-subnav${collapsed ? " is-collapsed" : ""}`}
      aria-label="FMS navigation"
    >
      <div className="ws-fms-subnav-top">
        <div className="ws-module-subnav-brand">
          <GitBranch size={18} aria-hidden />
          {!collapsed ? (
            <div>
              <strong>FMS</strong>
              <span>Flow management</span>
            </div>
          ) : null}
        </div>
        {!collapsed ? (
          <FmsInAppNotificationsBell
            notifications={notifications}
            unreadCount={unreadCount}
          />
        ) : null}
      </div>

      <ul className="ws-module-subnav-list ws-fms-subnav-list">
        {isManager ? (
          <li>
            <Link
              href="/app/fms/performance"
              className={`ws-module-subnav-link${navIsActive(pathname, "/app/fms/performance") ? " is-active" : ""}`}
              title="Performance"
            >
              <BarChart3 size={16} aria-hidden />
              {!collapsed ? (
                <span>
                  Performance
                  <small>FMS, doer, and week summary</small>
                </span>
              ) : null}
            </Link>
          </li>
        ) : null}

        <li className="ws-fms-subnav-group">
          <button
            type="button"
            className={`ws-module-subnav-link ws-fms-subnav-toggle${queueActive ? " is-active" : ""}`}
            aria-expanded={queueOpen && !collapsed}
            title="My queue"
            onClick={() => {
              if (collapsed) {
                setCollapsed(false);
                setQueueOpen(true);
                return;
              }
              setQueueOpen((value) => !value);
            }}
          >
            <TrainFront size={16} aria-hidden />
            {!collapsed ? (
              <span>
                My queue
                <small>Your workflow stops</small>
              </span>
            ) : null}
            {!collapsed ? (
              <ChevronDown
                size={14}
                className={`ws-fms-subnav-chevron${queueOpen ? " is-open" : ""}`}
                aria-hidden
              />
            ) : null}
          </button>
          {!collapsed && queueOpen ? (
            <ul className="ws-fms-subnav-nested">
              <li>
                <Link
                  href="/app/fms/my-stops"
                  className={`ws-fms-subnav-nested-link${pathname === "/app/fms/my-stops" ? " is-active" : ""}`}
                >
                  All workflows
                </Link>
              </li>
              {queueTemplates.map((template) => (
                <li key={template.id}>
                  <Link
                    href={`/app/fms/my-stops/${template.id}`}
                    className={`ws-fms-subnav-nested-link${pathname === `/app/fms/my-stops/${template.id}` ? " is-active" : ""}`}
                  >
                    <span>{template.name}</span>
                    {template.activeStops > 0 ? (
                      <em>{template.activeStops}</em>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </li>

        {isManager ? (
          <li>
            <Link
              href="/app/fms/lines"
              className={`ws-module-subnav-link${navIsActive(pathname, "/app/fms/lines") ? " is-active" : ""}`}
              title="Live pipelines"
            >
              <LayoutDashboard size={16} aria-hidden />
              {!collapsed ? (
                <span>
                  Live pipelines
                  <small>All active workflows</small>
                </span>
              ) : null}
            </Link>
          </li>
        ) : null}

        {isManager ? (
          <li>
            <Link
              href="/app/fms/ops"
              className={`ws-module-subnav-link${navIsActive(pathname, "/app/fms/ops") ? " is-active" : ""}`}
              title="Ops monitor"
            >
              <Radar size={16} aria-hidden />
              {!collapsed ? (
                <span>
                  Ops monitor
                  <small>Overdue and unassigned</small>
                </span>
              ) : null}
            </Link>
          </li>
        ) : null}

        {isManager ? (
          <li>
            <Link
              href="/app/fms/scores"
              className={`ws-module-subnav-link${navIsActive(pathname, "/app/fms/scores") ? " is-active" : ""}`}
              title="MIS scores"
            >
              <ListChecks size={16} aria-hidden />
              {!collapsed ? (
                <span>
                  MIS scores
                  <small>On-time performance</small>
                </span>
              ) : null}
            </Link>
          </li>
        ) : null}

        {canSetup ? (
          <li>
            <Link
              href="/app/fms/setup"
              className={`ws-module-subnav-link${navIsActive(pathname, "/app/fms/setup") ? " is-active" : ""}`}
              title="Setup"
            >
              <Settings2 size={16} aria-hidden />
              {!collapsed ? (
                <span>
                  Setup
                  <small>AI workflow setup</small>
                </span>
              ) : null}
            </Link>
          </li>
        ) : null}
      </ul>

      <div className="ws-fms-subnav-footer">
        <button
          type="button"
          className="ws-fms-subnav-collapse"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden />
          ) : (
            <PanelLeftClose size={18} aria-hidden />
          )}
          {!collapsed ? <span>Collapse</span> : null}
        </button>
      </div>
    </nav>
  );
}
