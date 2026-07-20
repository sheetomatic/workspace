"use client";

import { useEffect, useState, useTransition } from "react";
import { updateInboundLeadCategory } from "@/app/app/leads/actions";
import {
  leadCategoryLabel,
  listLeadCategoryOptions,
  resolveLeadCategoryId,
  type LeadCategoryId,
} from "@/lib/leads/categories";

export function LeadCategorySelect({
  leadId,
  value,
  disabled = false,
  className = "leads-category-select",
}: {
  leadId: string;
  value: string | null;
  disabled?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const resolved = resolveLeadCategoryId(value);
  const [current, setCurrent] = useState(resolved);

  useEffect(() => {
    setCurrent(resolved);
  }, [resolved, leadId]);

  if (disabled) {
    return (
      <span className="leads-category-badge" title="Category">
        {leadCategoryLabel(current)}
      </span>
    );
  }

  return (
    <select
      aria-label="Lead category"
      className={className}
      disabled={pending}
      title={leadCategoryLabel(current)}
      value={current}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onChange={(event) => {
        const category = event.target.value as LeadCategoryId;
        const previous = current;
        setCurrent(category);
        startTransition(async () => {
          const result = await updateInboundLeadCategory(leadId, category);
          if (!result.ok) {
            setCurrent(previous);
            window.alert(result.message ?? "Could not update category.");
          }
        });
      }}
    >
      {listLeadCategoryOptions().map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
