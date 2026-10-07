"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteAllDelegatedTasks } from "@/app/app/tasks/actions";

export function DeleteAllTasksButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function clearAll() {
    const confirmed = window.confirm(
      "Delete all tasks in this workspace? Open and completed tasks will be removed. This cannot be undone.",
    );
    if (!confirmed) return;

    setMessage(null);
    startTransition(async () => {
      const result = await deleteAllDelegatedTasks();
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <span className="ws-delete-all-tasks">
      <button
        type="button"
        className="ws-btn-danger ws-btn-small"
        disabled={pending}
        onClick={clearAll}
      >
        <Trash2 aria-hidden size={14} strokeWidth={1.75} />
        {pending ? "Deleting…" : "Delete all"}
      </button>
      {message ? (
        <span className="ws-delete-all-tasks__note" role="status">
          {message}
        </span>
      ) : null}
    </span>
  );
}
