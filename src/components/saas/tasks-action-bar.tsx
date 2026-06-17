"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { TaskFilters } from "@/components/saas/task-filters";

export function NewTaskTrigger({ className }: { className?: string }) {
  return (
    <Link
      className={className ?? "btn-cta btn-primary ws-new-task-trigger"}
      href="/app/tasks/create"
    >
      <Plus aria-hidden size={18} strokeWidth={2.25} />
      New task
    </Link>
  );
}

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

import type { WorkspaceIntegrationStatus } from "@/lib/workspace-integration-status";

export function TasksActionBar({
  members: _members,
  filterMembers,
  current,
  showCreate,
  showAssigneeFilter = true,
  filtersInOverview = false,
  integrationStatus: _integrationStatus,
}: {
  members: Member[];
  filterMembers: Array<{ id: string; name: string }>;
  current: {
    status?: string;
    assignee?: string;
    overdue?: string;
    doneToday?: string;
  };
  showCreate: boolean;
  showAssigneeFilter?: boolean;
  filtersInOverview?: boolean;
  integrationStatus?: WorkspaceIntegrationStatus;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      router.replace("/app/tasks/create");
    }
  }, [router, searchParams]);

  const showToolbar = !filtersInOverview;

  if (!showToolbar) {
    return null;
  }

  return (
    <div
      className={`ws-tasks-controls${filtersInOverview ? " ws-tasks-controls-compact" : ""}`}
    >
      <div className="ws-task-toolbar">
        <Suspense fallback={null}>
          <TaskFilters
            current={current}
            members={filterMembers}
            showAssigneeFilter={showAssigneeFilter}
          />
        </Suspense>

        {showCreate ? <NewTaskTrigger /> : null}
      </div>
    </div>
  );
}
