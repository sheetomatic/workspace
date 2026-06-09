import Link from "next/link";
import type { AssigneeCountRow } from "@/lib/legal-cases/queries";
import { LEGAL_CASES_LIST_PATH } from "@/lib/legal-cases/list-filters";
import { LegalFilterCountLink } from "@/components/legal/legal-filter-count-link";
import { TeamPasswordResetButton } from "@/components/saas/team-password-reset-button";
import "./legal-cases.css";

type TeamMember = {
  id: string;
  role: string;
  staffCode: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

export function LegalTeamPanel({
  members,
  assigneeBreakdown,
  canManage = false,
  currentUserId,
}: {
  members: TeamMember[];
  assigneeBreakdown: AssigneeCountRow[];
  canManage?: boolean;
  currentUserId?: string;
}) {
  const countByCode = new Map(
    assigneeBreakdown.map((row) => [row.code.toUpperCase(), row.caseCount]),
  );

  const rows = members
    .map((member) => ({
      ...member,
      code: member.staffCode?.trim().toUpperCase() ?? "",
      caseCount: member.staffCode
        ? (countByCode.get(member.staffCode.trim().toUpperCase()) ?? 0)
        : 0,
    }))
    .sort(
      (a, b) =>
        b.caseCount - a.caseCount ||
        (a.user.name ?? "").localeCompare(b.user.name ?? ""),
    );

  return (
    <div className="legal-card legal-card-assignees legal-team-panel">
      <div className="legal-card-head">
        <h3>Case team</h3>
        <Link className="legal-panel-link" href={LEGAL_CASES_LIST_PATH}>
          All cases
        </Link>
      </div>
      <div className="legal-table-scroll legal-table-scroll-short">
        <table className="crm-data-table hs-data-table legal-table-compact legal-team-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Code</th>
              <th>Cases</th>
              {canManage ? <th>Password</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((member) => {
              const label = member.user.name ?? member.user.email;
              const isSelf = member.user.id === currentUserId;

              return (
                <tr key={member.id}>
                  <td>{member.user.name ?? "-"}</td>
                  <td className="legal-cell-truncate">{member.user.email}</td>
                  <td>{member.role}</td>
                  <td>
                    <strong>{member.code || "-"}</strong>
                  </td>
                  <td>
                    {member.code ? (
                      <LegalFilterCountLink
                        assignee={member.code}
                        count={member.caseCount}
                      />
                    ) : (
                      <span className="legal-count-muted">-</span>
                    )}
                  </td>
                  {canManage ? (
                    <td>
                      {isSelf ? (
                        <Link className="legal-panel-link" href="/app/settings">
                          Settings
                        </Link>
                      ) : (
                        <TeamPasswordResetButton
                          disabled={isSelf}
                          memberLabel={label}
                          membershipId={member.id}
                        />
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
