"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { LegalSectionNumber } from "@/lib/legal-cases/constants";
import { LEGAL_CASES_LIST_PATH } from "@/lib/legal-cases/list-filters";
import type { LegalListMetric } from "@/lib/legal-cases/queries";

type LegalFilterCountLinkProps = {
  count: number;
  assignee?: string;
  section?: LegalSectionNumber;
  fileStatus?: string;
  caseStage?: string;
  metric?: LegalListMetric;
  mode?: "admin" | "doer";
  variant?: "default" | "stat" | "row" | "pill";
  maxCount?: number;
  rowLabel?: string;
};

export function LegalFilterCountLink({
  count,
  assignee,
  section,
  fileStatus,
  caseStage,
  metric,
  mode = "admin",
  variant = "default",
  maxCount,
  rowLabel,
}: LegalFilterCountLinkProps) {
  const searchParams = useSearchParams();
  const activeAssignee = searchParams.get("assignee") ?? "";
  const activeSection = searchParams.get("section") ?? "";
  const activeFileStatus = searchParams.get("fileStatus") ?? "";
  const activeCaseStage = searchParams.get("caseStage") ?? "";
  const activeMetric = searchParams.get("metric") ?? "";

  if (count <= 0) {
    return variant === "stat" ? (
      <strong className="legal-count-muted">0</strong>
    ) : (
      <span className="legal-count-muted">-</span>
    );
  }

  const isActive =
    mode === "doer" && section !== undefined
      ? activeSection === String(section)
      : metric
        ? activeMetric === metric
        : fileStatus
          ? activeFileStatus === fileStatus
          : caseStage
            ? activeCaseStage === caseStage
            : assignee && section !== undefined
              ? activeAssignee.toUpperCase() === assignee.toUpperCase() &&
                activeSection === String(section)
              : section !== undefined && !assignee
                ? activeSection === String(section) && !activeAssignee
                : assignee
                  ? activeAssignee.toUpperCase() === assignee.toUpperCase() &&
                    !activeSection
                  : false;

  const params = new URLSearchParams(searchParams.toString());
  params.delete("page");

  if (isActive) {
    if (mode === "doer" && section !== undefined) {
      params.delete("section");
    } else if (metric) {
      params.delete("metric");
    } else if (fileStatus) {
      params.delete("fileStatus");
    } else if (caseStage) {
      params.delete("caseStage");
    } else if (section !== undefined && !assignee) {
      params.delete("section");
    } else if (assignee) {
      params.delete("assignee");
      if (section !== undefined) {
        params.delete("section");
      }
    }
  } else if (mode === "doer" && section !== undefined) {
    params.delete("assignee");
    params.delete("fileStatus");
    params.delete("caseStage");
    params.delete("metric");
    params.set("section", String(section));
  } else if (metric) {
    params.delete("fileStatus");
    params.delete("caseStage");
    params.delete("assignee");
    params.delete("section");
    params.set("metric", metric);
  } else if (fileStatus) {
    params.delete("metric");
    params.delete("caseStage");
    params.delete("assignee");
    params.delete("section");
    params.set("fileStatus", fileStatus);
  } else if (caseStage) {
    params.delete("metric");
    params.delete("fileStatus");
    params.delete("assignee");
    params.delete("section");
    params.set("caseStage", caseStage);
  } else if (section !== undefined && !assignee) {
    params.delete("metric");
    params.delete("fileStatus");
    params.delete("caseStage");
    params.delete("assignee");
    params.set("section", String(section));
  } else if (assignee) {
    params.delete("metric");
    params.delete("fileStatus");
    params.delete("caseStage");
    params.set("assignee", assignee);
    if (section !== undefined) {
      params.set("section", String(section));
    } else {
      params.delete("section");
    }
  }

  const query = params.toString();
  const href = query ? `${LEGAL_CASES_LIST_PATH}?${query}` : LEGAL_CASES_LIST_PATH;

  let title = "Open filtered case list";
  if (mode === "doer" && section) {
    title = `Show my Section ${section} cases`;
  } else if (metric === "hearings") {
    title = "Show cases with next date";
  } else if (metric) {
    title = `Show ${metric} cases`;
  } else if (section && assignee) {
    title = `Show ${assignee} Section ${section} cases`;
  } else if (section) {
    title = `Show Section ${section} cases`;
  } else if (assignee) {
    title = `Show all ${assignee} cases`;
  } else if (fileStatus) {
    title = `Show ${fileStatus} cases`;
  } else if (caseStage) {
    title = `Show ${caseStage} stage cases`;
  }

  const className =
    variant === "stat"
      ? `legal-count-link legal-count-link-stat${isActive ? " is-active" : ""}`
      : variant === "row"
        ? `legal-chart-row-link${isActive ? " is-active" : ""}`
        : variant === "pill"
          ? `legal-section-pill-count${isActive ? " is-active" : ""}`
          : `legal-count-link${isActive ? " is-active" : ""}`;

  if (variant === "row") {
    const label =
      rowLabel ?? fileStatus ?? caseStage ?? assignee ?? "Unknown";
    const barMax = Math.max(maxCount ?? count, 1);
    const width = Math.max(6, Math.round((count / barMax) * 100));

    return (
      <Link
        aria-current={isActive ? "true" : undefined}
        className={className}
        href={href}
        title={title}
      >
        <span className="legal-chart-label" title={label}>
          {label}
        </span>
        <span className="legal-chart-track" aria-hidden="true">
          <span className="legal-chart-bar" style={{ width: `${width}%` }} />
        </span>
        <span className="legal-chart-count">{count.toLocaleString()}</span>
      </Link>
    );
  }

  return (
    <Link
      aria-current={isActive ? "true" : undefined}
      className={className}
      href={href}
      title={title}
    >
      {count.toLocaleString()}
    </Link>
  );
}
