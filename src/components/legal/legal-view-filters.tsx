"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { LegalViewFilterOptions } from "@/lib/legal-cases/view-queries";

type LegalViewFiltersProps = {
  options: LegalViewFilterOptions;
  current: {
    category?: string;
    assignee?: string;
    fileStatus?: string;
    caseStage?: string;
    section?: string;
  };
  showCategory?: boolean;
};

export function LegalViewFilters({
  options,
  current,
  showCategory = true,
}: LegalViewFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasFilters =
    (showCategory && options.categories.length > 0) ||
    options.assignees.length > 0 ||
    options.statuses.length > 0 ||
    options.stages.length > 0 ||
    options.sections.length > 0;

  if (!hasFilters) return null;

  function onChange(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    const query = params.toString();
    router.push(
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
  }

  return (
    <div className="legal-view-filters">
      {showCategory && options.categories.length > 0 ? (
        <label className="legal-view-filter">
          Category
          <select
            defaultValue={current.category ?? ""}
            onChange={(event) => onChange("category", event.target.value)}
          >
            <option value="">All categories</option>
            {options.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {options.assignees.length > 0 ? (
        <label className="legal-view-filter">
          Assignee
          <select
            defaultValue={current.assignee ?? ""}
            onChange={(event) => onChange("assignee", event.target.value)}
          >
            <option value="">All assignees</option>
            {options.assignees.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {options.statuses.length > 0 ? (
        <label className="legal-view-filter">
          Status
          <select
            defaultValue={current.fileStatus ?? ""}
            onChange={(event) => onChange("fileStatus", event.target.value)}
          >
            <option value="">All statuses</option>
            {options.statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {options.sections.length > 0 ? (
        <label className="legal-view-filter">
          Section
          <select
            defaultValue={current.section ?? ""}
            onChange={(event) => onChange("section", event.target.value)}
          >
            <option value="">All sections</option>
            {options.sections.map((section) => (
              <option key={section.value} value={section.value}>
                {section.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {options.stages.length > 0 ? (
        <label className="legal-view-filter">
          Stage
          <select
            defaultValue={current.caseStage ?? ""}
            onChange={(event) => onChange("caseStage", event.target.value)}
          >
            <option value="">All stages</option>
            {options.stages.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
