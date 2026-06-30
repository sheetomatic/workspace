"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateInboundLeadCategory } from "@/app/app/leads/actions";
import {
  leadCategoryLabel,
  listLeadCategoryOptions,
  resolveLeadCategoryId,
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = resolveLeadCategoryId(value);

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
      value={current}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onChange={(event) => {
        const category = event.target.value;
        startTransition(async () => {
          await updateInboundLeadCategory(leadId, category);
          router.refresh();
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
