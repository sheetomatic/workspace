"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function TaskFeedbackToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("");

  useEffect(() => {
    const assigned = searchParams.get("assigned") === "1";
    const updated = searchParams.get("updated") === "1";
    if (!assigned && !updated) {
      setMessage("");
      return;
    }

    const raw = searchParams.get("toast");
    setMessage(
      raw
        ? decodeURIComponent(raw)
        : assigned
          ? "Task assigned. See it in the execution queue below."
          : "Task updated.",
    );

    const queue = document.getElementById("execution-queue");
    queue?.scrollIntoView({ behavior: "smooth", block: "start" });

    const url = new URL(window.location.href);
    url.searchParams.delete("assigned");
    url.searchParams.delete("updated");
    url.searchParams.delete("toast");
    router.replace(url.pathname + url.hash, { scroll: false });
  }, [searchParams, router]);

  if (!message) {
    return null;
  }

  return (
    <div className="ws-task-toast" role="status">
      <strong>Success</strong>
      <p>{message}</p>
    </div>
  );
}
