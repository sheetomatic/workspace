"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { HrActionResult } from "@/lib/hr/hr-result";

export function FieldVisitStatusButton({
  visitId,
  status,
  label,
  action,
}: {
  visitId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  label: string;
  action: (formData: FormData) => Promise<HrActionResult>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <input type="hidden" name="visitId" value={visitId} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className="btn-cta btn-primary" disabled={pending}>
        {pending ? "Saving…" : label}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
