"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function TaskFeedbackToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const assigned = searchParams.get("assigned") === "1";
    const updated = searchParams.get("updated") === "1";
    if (!assigned && !updated) {
      setMessage("");
      return;
    }

    const raw = searchParams.get("toast");
    const level = searchParams.get("toastLevel");
    setMessage(
      raw
        ? decodeURIComponent(raw)
        : assigned
          ? "Task assigned. See it in the execution queue below."
          : "Task updated.",
    );
    setIsWarning(level === "warning");

    const queue = document.getElementById("execution-queue");
    queue?.scrollIntoView({ behavior: "smooth", block: "start" });

    const url = new URL(window.location.href);
    url.searchParams.delete("assigned");
    url.searchParams.delete("updated");
    url.searchParams.delete("toast");
    url.searchParams.delete("toastLevel");
    router.replace(url.pathname + url.hash, { scroll: false });
  }, [searchParams, router]);

  if (!message) {
    return null;
  }

  return (
    <div
      className={isWarning ? "ws-task-toast is-warning" : "ws-task-toast"}
      role="status"
    >
      <strong>{isWarning ? "Assigned — check WhatsApp" : "Success"}</strong>
      <p>{message}</p>
    </div>
  );
}
