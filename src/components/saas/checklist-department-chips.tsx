"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CHECKLIST_TEAM_LABELS } from "@/lib/checklists/constants";
import { CHECKLIST_DEPARTMENT_HREFS } from "@/lib/checklists/pc-rows";

const DEPARTMENTS = ["ACCOUNTS", "HR", "MAINTENANCE"] as const;

export function ChecklistDepartmentChips({
  activeTeam,
}: {
  activeTeam: string;
}) {
  const searchParams = useSearchParams();

  return (
    <nav className="ws-pc-dept-chips" aria-label="Checklist departments">
      {DEPARTMENTS.map((team) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("dept");
        params.delete("tab");
        const query = params.toString();
        const href = `${CHECKLIST_DEPARTMENT_HREFS[team]}${query ? `?${query}` : ""}`;
        const active = activeTeam === team;
        return (
          <Link
            key={team}
            href={href}
            className={`ws-pc-dept-chip${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {CHECKLIST_TEAM_LABELS[team] ?? team}
          </Link>
        );
      })}
    </nav>
  );
}
