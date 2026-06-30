"use client";

import type { InboundLeadStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = resolveLeadStatus(value);

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
        startTransition(async () => {
          await updateInboundLeadStatus(leadId, status);
          router.refresh();
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
