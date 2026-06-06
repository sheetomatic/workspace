"use client";

import { Mail } from "lucide-react";
import {
  buildTeamHierarchy,
  displayName,
  type TeamMemberHierarchyRow,
} from "@/lib/team-hierarchy";
import { ROLE_LABELS } from "@/lib/permissions";

function HierarchyMemberRow({
  member,
  indent = 0,
  showManagerLabel = false,
}: {
  member: TeamMemberHierarchyRow;
  indent?: number;
  showManagerLabel?: boolean;
}) {
  const name = displayName(member);

  return (
    <div
      className="saas-member-row saas-hierarchy-member-row"
      style={{ paddingLeft: `${0.65 + indent * 1.25}rem` }}
    >
      <div className="saas-member-leading saas-hierarchy-member-leading">
        <span aria-hidden className="crm-avatar sm saas-hierarchy-avatar">
          {name.slice(0, 2).toUpperCase()}
        </span>
        <div className="saas-hierarchy-member-copy">
          <div className="saas-member-inline">
            <strong>{name}</strong>
            {member.isDepartmentHead ? (
              <>
                <span className="saas-member-sep">{" \u00b7 "}</span>
                <span className="saas-hierarchy-dept-head-badge">Dept head</span>
              </>
            ) : null}
            {showManagerLabel ? (
              <>
                <span className="saas-member-sep">{" \u00b7 "}</span>
                <span className="saas-hierarchy-manager-label">Manager</span>
              </>
            ) : null}
            <span className="saas-member-sep">{" \u00b7 "}</span>
            <span className={`saas-role-pill role-${member.role.toLowerCase()}`}>
              {ROLE_LABELS[member.role]}
            </span>
          </div>
          <p className="saas-hierarchy-member-email">
            <Mail aria-hidden size={12} strokeWidth={2.25} />
            <a href={`mailto:${member.user.email}`}>{member.user.email}</a>
          </p>
          {member.designation ? (
            <p className="saas-member-meta">{member.designation}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TeamHierarchyPanel({
  members,
  canManage,
}: {
  members: TeamMemberHierarchyRow[];
  canManage: boolean;
}) {
  const groups = buildTeamHierarchy(members);

  if (groups.length === 0) {
    return (
      <section className="saas-form-panel saas-team-hierarchy">
        <h3>Organization hierarchy</h3>
        <p className="saas-team-invite-lead">No team members to display yet.</p>
      </section>
    );
  }

  return (
    <section className="saas-form-panel saas-team-hierarchy">
      <div className="saas-team-hierarchy-head">
        <h3>Organization hierarchy</h3>
        <p className="saas-team-invite-lead">
          {canManage
            ? "Users grouped by department and reporting manager. Emails are shown for every member."
            : "Your department team grouped by reporting manager."}
        </p>
      </div>

      <div className="saas-team-hierarchy-groups">
        {groups.map((group) => (
          <article className="saas-team-hierarchy-dept" key={group.department}>
            <header className="saas-team-hierarchy-dept-head">
              <div>
                <h4>{group.departmentLabel}</h4>
                {group.departmentHead ? (
                  <p className="saas-team-hierarchy-dept-meta">
                    Department head:{" "}
                    <strong>{displayName(group.departmentHead)}</strong>
                    <span className="saas-member-sep">{" \u00b7 "}</span>
                    <a href={`mailto:${group.departmentHead.user.email}`}>
                      {group.departmentHead.user.email}
                    </a>
                  </p>
                ) : (
                  <p className="saas-team-hierarchy-dept-meta saas-hierarchy-warning">
                    No department head assigned
                  </p>
                )}
              </div>
              <span className="saas-hierarchy-count">
                {group.managers.reduce(
                  (total, item) => total + item.members.length,
                  0,
                ) + group.unassigned.length}{" "}
                members
              </span>
            </header>

            <div className="saas-members-list saas-hierarchy-list">
              {group.managers.map(({ manager, members: reports }) => (
                <div className="saas-hierarchy-manager-block" key={manager.id}>
                  <HierarchyMemberRow showManagerLabel member={manager} />
                  {reports.map((member) => (
                    <HierarchyMemberRow indent={1} key={member.id} member={member} />
                  ))}
                </div>
              ))}

              {group.unassigned.length > 0 ? (
                <div className="saas-hierarchy-unassigned">
                  {group.managers.length > 0 ? (
                    <p className="saas-hierarchy-unassigned-label">
                      {canManage
                        ? "Not under a listed manager in this department"
                        : "Other department members"}
                    </p>
                  ) : null}
                  {group.unassigned.map((member) => (
                    <HierarchyMemberRow key={member.id} member={member} />
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
