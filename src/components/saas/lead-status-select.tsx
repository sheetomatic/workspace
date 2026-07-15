"use client";

import type { InboundLeadStatus } from "@prisma/client";
import { useEffect, useState, useTransition } from "react";
import { updateInboundLeadStatus } from "@/app/app/leads/actions";
import {
  leadStatusLabel,
  listLeadStatusOptions,
  resolveLeadStatus,
} from "@/lib/leads/status-labels";

export function LeadStatusSelect({
  leadId,
  value,
  disabled = false,
  className = "leads-status-select",
}: {
  leadId: string;
  value: InboundLeadStatus | string;
  disabled?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const resolved = resolveLeadStatus(value);
  const [current, setCurrent] = useState(resolved);

  useEffect(() => {
    setCurrent(resolved);
  }, [resolved, leadId]);

  if (disabled) {
    return (
      <span className="leads-status-badge" title="Status">
        {leadStatusLabel(current)}
      </span>
    );
  }

  return (
    <select
      aria-label="Lead status"
      className={className}
      disabled={pending}
      value={current}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onChange={(event) => {
        const status = event.target.value as InboundLeadStatus;
        const previous = current;
        setCurrent(status);
        startTransition(async () => {
          const result = await updateInboundLeadStatus(leadId, status);
          if (!result.ok) {
            setCurrent(previous);
            window.alert(result.message ?? "Could not update status.");
          }
        });
      }}
    >
      {listLeadStatusOptions().map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
