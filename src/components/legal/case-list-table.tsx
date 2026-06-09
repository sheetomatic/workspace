import Link from "next/link";
import type { LegalCase } from "@prisma/client";
import {
  assignedSectionsForCode,
  isLegalAdmin,
  userStaffCode,
} from "@/lib/legal-cases/access";
import type { SessionUser } from "@/lib/auth";

function statusBadgeClass(status: string | null | undefined) {
  const value = status?.toUpperCase() ?? "";
  if (value === "RUNNING") return "legal-badge status-running";
  if (value === "CLOSED") return "legal-badge status-closed";
  if (value === "ORDER") return "legal-badge status-order";
  if (value.includes("APPEAL")) return "legal-badge status-appeal";
  return "legal-badge status-default";
}

function uniqueAssigneeCodes(item: LegalCase) {
  return [
    ...new Set(
      [
        item.s2Responsible,
        item.s3Responsible,
        item.s4Responsible,
        item.s5Responsible,
        item.s6Responsible,
        item.s7Responsible,
      ]
        .map((value) => value?.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
}

function AssigneeCell({ item, user }: { item: LegalCase; user: SessionUser }) {
  if (isLegalAdmin(user)) {
    const codes = uniqueAssigneeCodes(item);
    if (codes.length === 0) {
      return <>-</>;
    }
    return (
      <span className="legal-assignee-pill-row">
        {codes.map((code) => (
          <span key={code} className="legal-assignee-pill">
            {code}
          </span>
        ))}
      </span>
    );
  }

  const mine = assignedSectionsForCode(item, userStaffCode(user));
  if (mine.length === 0) {
    return <>-</>;
  }
  return (
    <span className="legal-assignee-pill-row">
      {mine.map((section) => (
        <span key={section} className="legal-assignee-pill legal-assignee-pill-section">
          S{section}
        </span>
      ))}
    </span>
  );
}

export function CaseListTable({
  items,
  user,
  compact = false,
}: {
  items: (LegalCase & { _count: { documents: number } })[];
  user: SessionUser;
  compact?: boolean;
}) {
  const admin = isLegalAdmin(user);
  const tableClass = compact
    ? "crm-data-table hs-data-table legal-table-compact legal-list-table"
    : "crm-data-table hs-data-table legal-table-compact";

  return (
    <table className={tableClass}>
      <thead>
        <tr>
          <th>File No.</th>
          <th>MCC No.</th>
          <th>Applicant</th>
          <th>Category</th>
          <th>Status</th>
          <th>Stage</th>
          <th>Court</th>
          <th>{admin ? "Assignees" : "My sections"}</th>
          <th>Docs</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td colSpan={9}>No cases match your filters.</td>
          </tr>
        ) : (
          items.map((item) => (
            <tr key={item.id}>
              <td>
                <Link className="legal-case-link" href={`/app/cases/${item.id}`}>
                  {item.fileNumber}
                </Link>
              </td>
              <td>{item.mccNumber ?? "-"}</td>
              <td className="legal-cell-truncate">{item.applicant ?? "-"}</td>
              <td>{item.category ?? "-"}</td>
              <td>
                <span className={statusBadgeClass(item.fileStatus)}>
                  {item.fileStatus ?? "-"}
                </span>
              </td>
              <td>{item.caseStage ?? "-"}</td>
              <td>{item.court ?? "-"}</td>
              <td>
                <AssigneeCell item={item} user={user} />
              </td>
              <td>{item._count.documents}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
