"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { TaskCreateForm } from "@/components/saas/task-create-form";
import { TaskFilters } from "@/components/saas/task-filters";

type Member = {
  id: string;
  name: string;
  email: string;
};

export function TasksActionBar({
  members,
  filterMembers,
  current,
  showCreate,
}: {
  members: Member[];
  filterMembers: Array<{ id: string; name: string }>;
  current: {
    status?: string;
    assignee?: string;
    overdue?: string;
  };
  showCreate: boolean;
}) {
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
    }
  }, [searchParams]);

  return (
    <div className="ws-tasks-controls">
      <div className="ws-task-toolbar">
        <TaskFilters current={current} members={filterMembers} />

        {showCreate && !open ? (
          <button
            className="btn-cta btn-primary ws-new-task-trigger"
            type="button"
            onClick={() => setOpen(true)}
          >
            <Plus aria-hidden size={18} strokeWidth={2.25} />
            New task
          </button>
        ) : null}
      </div>

      {showCreate && open ? (
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
              onClick={() => setOpen(false)}
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
