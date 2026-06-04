"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { TaskCreateForm } from "@/components/saas/task-create-form";
import { TaskFilters } from "@/components/saas/task-filters";

export function NewTaskTrigger({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (searchParams.get("new") === "1") {
    return null;
  }

  function openCreate() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("new", "1");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <button
      className={className ?? "btn-cta btn-primary ws-new-task-trigger"}
      type="button"
      onClick={openCreate}
    >
      <Plus aria-hidden size={18} strokeWidth={2.25} />
      New task
    </button>
  );
}

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

export function TasksActionBar({
  members,
  filterMembers,
  current,
  showCreate,
  showAssigneeFilter = true,
  filtersInOverview = false,
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
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("assigned") === "1") {
      setOpen(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setOpen(true);
    } else if (searchParams.get("new") !== "1") {
      setOpen(false);
    }
  }, [searchParams]);

  function closeCreate() {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const showToolbar = !filtersInOverview;
  const showPanel = showCreate && open;

  if (!showToolbar && !showPanel) {
    return null;
  }

  return (
    <div
      className={`ws-tasks-controls${filtersInOverview ? " ws-tasks-controls-compact" : ""}`}
    >
      {showToolbar ? (
        <div className="ws-task-toolbar">
          <TaskFilters
            current={current}
            members={filterMembers}
            showAssigneeFilter={showAssigneeFilter}
          />

          {showCreate && !open ? <NewTaskTrigger /> : null}
        </div>
      ) : null}

      {showPanel ? (
        <section className="ws-new-task-panel">
          <header className="ws-new-task-panel-head">
            <div>
              <h2>Create task</h2>
              <p>Assign to one or more team members with schedule and reminders.</p>
            </div>
            <button
              aria-label="Close create task"
              className="ws-new-task-close"
              type="button"
              onClick={closeCreate}
            >
              <X size={18} />
            </button>
          </header>

          <Suspense fallback={<p className="ws-task-ai-lead">Loading form...</p>}>
            <TaskCreateForm members={members} />
          </Suspense>
        </section>
      ) : null}
    </div>
  );
}
