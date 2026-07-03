"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { KeyRound, Mail, Pencil, Trash2 } from "lucide-react";
import type { AttendanceWorkMode, Role, TaskDepartment, WorkspaceModule } from "@prisma/client";
import {
  inviteTeamMember,
  removeTeamMember,
  resetTeamMemberPassword,
  updateTeamMemberDetails,
  type TeamActionState,
} from "@/app/app/team/actions";
import {
  WorkspaceModuleFields,
  WorkspaceModulePills,
} from "@/components/saas/workspace-module-fields";
import { formatWhatsAppPhone } from "@/lib/phone";
import { ROLE_LABELS } from "@/lib/permissions";
import { TASK_DEPARTMENT_LABELS } from "@/lib/tasks";

const initialState: TeamActionState = { ok: false, message: "" };
const META_SEPARATOR = " \u00b7 ";

const roleOptions: Role[] = ["VIEWER", "STAFF", "MANAGER", "ADMIN", "OWNER"];
const departmentOptions = Object.entries(TASK_DEPARTMENT_LABELS) as Array<
  [TaskDepartment, string]
>;

const ATTENDANCE_WORK_MODE_LABELS: Record<AttendanceWorkMode, string> = {
  OFFICE: "Office attendance",
  FIELD: "Field executive",
  HYBRID: "Office + field",
};

export type TeamMemberRow = {
  id: string;
  role: Role;
  department: TaskDepartment | null;
  designation: string | null;
  isDepartmentHead: boolean;
  reportingManagerId: string | null;
  reportingManager: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  } | null;
  attendanceWorkMode: AttendanceWorkMode;
  geoFenceRequired: boolean;
  faceRequired: boolean;
  modules: WorkspaceModule[];
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
};

function managerOptionsForMember(
  members: TeamMemberRow[],
  excludeMembershipId?: string,
) {
  return members
    .filter((member) => member.id !== excludeMembershipId)
    .sort((a, b) => {
      const nameA = a.user.name ?? a.user.email;
      const nameB = b.user.name ?? b.user.email;
      return nameA.localeCompare(nameB);
    });
}

function whatsappInputValue(phone: string | null | undefined) {
  if (!phone) {
    return "";
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    return digits.slice(2);
  }
  return digits;
}

function whatsAppHref(phone: string | null | undefined) {
  if (!phone) {
    return null;
  }
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? `https://wa.me/${digits}` : null;
}

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      className="saas-contact-icon saas-contact-icon-wa"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function MemberContactLinks({
  email,
  phone,
}: {
  email: string;
  phone: string | null;
}) {
  const formattedPhone = formatWhatsAppPhone(phone);
  const waHref = whatsAppHref(phone);

  return (
    <div className="saas-member-contact saas-member-contact-icons">
      <a
        aria-label={`Email ${email}`}
        className="btn-icon btn-icon-contact btn-icon-email"
        href={`mailto:${email}`}
        title={email}
      >
        <Mail aria-hidden size={15} strokeWidth={2.25} />
      </a>
      {phone && waHref ? (
        <a
          aria-label={`WhatsApp ${formattedPhone}`}
          className="btn-icon btn-icon-contact btn-icon-wa"
          href={waHref}
          rel="noreferrer"
          target="_blank"
          title={formattedPhone}
        >
          <WhatsAppIcon size={15} />
        </a>
      ) : (
        <span
          aria-label="No WhatsApp number"
          className="btn-icon btn-icon-contact btn-icon-wa btn-icon-disabled"
          title="No WhatsApp number"
        >
          <WhatsAppIcon size={15} />
        </span>
      )}
    </div>
  );
}

function memberInitials(name: string | null, email: string) {
  const source = name?.trim() || email.split("@")[0] || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function TeamLoginCredentials({
  email,
  password,
  emailSent,
}: {
  email?: string;
  password?: string;
  emailSent?: boolean;
}) {
  if (!email) {
    return null;
  }

  if (emailSent && !password) {
    return (
      <div className="saas-team-credentials saas-team-credentials-sent">
        <p className="saas-team-credentials-title">Email sent</p>
        <p className="saas-team-credentials-note">
          Login instructions were emailed to <strong>{email}</strong>. Ask them
          to check inbox and spam, then sign in at sheetomatic.com/login.
        </p>
      </div>
    );
  }

  return (
    <div className="saas-team-credentials">
      <p className="saas-team-credentials-title">Login details to share</p>
      <dl>
        <div>
          <dt>Sign-in URL</dt>
          <dd>
            <code>sheetomatic.com/login</code>
          </dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>
            <code>{email}</code>
          </dd>
        </div>
        {password ? (
          <div>
            <dt>Temporary password</dt>
            <dd>
              <code>{password}</code>
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="saas-team-credentials-note">
        Email could not be sent automatically. Share these once over WhatsApp or
        email. Use the key icon on their card to reset if they forget the
        password.
      </p>
    </div>
  );
}

function MemberEditForm({
  member,
  members,
  onCancel,
  orgAllowedModules,
}: {
  member: TeamMemberRow;
  members: TeamMemberRow[];
  onCancel: () => void;
  orgAllowedModules?: WorkspaceModule[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    updateTeamMemberDetails,
    initialState,
  );
  const [editRole, setEditRole] = useState(member.role);
  const managerOptions = managerOptionsForMember(members, member.id);
  const reportingRequired = editRole !== "OWNER";

  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  useEffect(() => {
    if (state.ok) {
      onCancel();
    }
  }, [state.ok, onCancel]);

  return (
    <form action={action} className="saas-team-edit-form" ref={formRef}>
      <input name="membershipId" type="hidden" value={member.id} />
      <div className="form-grid-premium">
        <label>
          Name
          <input
            defaultValue={member.user.name ?? ""}
            name="name"
            required
            type="text"
          />
        </label>
        <label>
          Email
          <input
            defaultValue={member.user.email}
            disabled
            name="emailDisplay"
            type="email"
          />
        </label>
        <label>
          WhatsApp
          <input
            defaultValue={whatsappInputValue(member.user.phone)}
            inputMode="tel"
            name="whatsapp"
                    placeholder="9329103106"
            type="tel"
          />
        </label>
        <label>
          Department
          <select
            defaultValue={member.department ?? "GENERAL"}
            name="department"
            required
          >
            {departmentOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Designation
          <input
            defaultValue={member.designation ?? ""}
            name="designation"
            placeholder="e.g. MIS Executive"
            required
            type="text"
          />
        </label>
        <label>
          Role
          <select
            defaultValue={member.role}
            name="role"
            required
            onChange={(event) => setEditRole(event.target.value as Role)}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reporting manager
          <select
            defaultValue={member.reportingManagerId ?? ""}
            name="reportingManagerId"
            required={reportingRequired}
          >
            {!reportingRequired ? <option value="">None (owner)</option> : null}
            <option disabled={reportingRequired} value="">
              {reportingRequired ? "Select reporting manager" : "None"}
            </option>
            {managerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.user.name ?? option.user.email} · {option.user.email}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field-full ws-attendance-check">
          <input
            defaultChecked={member.isDepartmentHead}
            name="isDepartmentHead"
            type="checkbox"
          />
          <span>Department head (can view this department&apos;s team)</span>
        </label>
      </div>

      <WorkspaceModuleFields
        defaultModules={member.modules}
        lockSelection
        orgAllowedModules={orgAllowedModules}
        role={editRole}
      />

      <fieldset className="ws-member-hr-settings">
        <legend>Attendance settings</legend>
        <div className="form-grid-premium">
          <label>
            Work mode
            <select
              defaultValue={member.attendanceWorkMode}
              name="attendanceWorkMode"
              required
            >
              {(Object.entries(ATTENDANCE_WORK_MODE_LABELS) as Array<
                [AttendanceWorkMode, string]
              >).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="ws-attendance-checklist">
          <label className="ws-attendance-check">
            <input
              defaultChecked={member.geoFenceRequired}
              name="geoFenceRequired"
              type="checkbox"
            />
            <span>Require geo-fenced check-in for this member</span>
          </label>
          <label className="ws-attendance-check">
            <input
              defaultChecked={member.faceRequired}
              name="faceRequired"
              type="checkbox"
            />
            <span>Require face verification for this member</span>
          </label>
        </div>
      </fieldset>

      <div className="form-actions">
        <button className="btn-cta btn-primary" disabled={pending} type="submit">
          {pending ? "Saving..." : "Save changes"}
        </button>
        <button className="btn-cta btn-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {state.message ? (
        <p className={state.ok ? "saas-form-message ok" : "saas-form-message error"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function TeamManagementPanel({
  members,
  currentUserId,
  canManage = true,
  orgAllowedModules,
}: {
  members: TeamMemberRow[];
  currentUserId: string;
  canManage?: boolean;
  orgAllowedModules?: WorkspaceModule[];
}) {
  const [inviteState, inviteAction, invitePending] = useActionState(
    inviteTeamMember,
    initialState,
  );
  const [resetState, setResetState] = useState<TeamActionState | null>(null);
  const [inviteRole, setInviteRole] = useState<Role>("STAFF");
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const inviteReportingRequired = inviteRole !== "OWNER";
  const managerOptions = managerOptionsForMember(members);

  function removeMember(membershipId: string) {
    startTransition(async () => {
      await removeTeamMember(membershipId);
      if (editingId === membershipId) {
        setEditingId(null);
      }
    });
  }

  function resetPassword(membershipId: string) {
    startTransition(async () => {
      const result = await resetTeamMemberPassword(membershipId);
      setResetState(result);
    });
  }

  function openEdit(membershipId: string) {
    setEditingId((current) => (current === membershipId ? null : membershipId));
  }

  useEffect(() => {
    if (inviteState.message) {
      setInviteOpen(true);
    }
  }, [inviteState.message]);

  return (
    <div className="saas-team-panel">
      {canManage && resetState?.message ? (
        <div className="saas-form-panel saas-team-reset-panel">
          <p
            className={
              resetState.ok ? "saas-form-message ok" : "saas-form-message error"
            }
          >
            {resetState.message}
          </p>
          {resetState.ok ? (
            <TeamLoginCredentials
              email={resetState.loginEmail}
              emailSent={resetState.emailSent}
              password={resetState.tempPassword}
            />
          ) : null}
        </div>
      ) : null}

      <div className="saas-team-cards-wrap">
        <div className="saas-team-cards">
          {members.map((member) => {
            const isSelf = member.user.id === currentUserId;
            const isEditing = editingId === member.id;
            const deptLabel = member.department
              ? TASK_DEPARTMENT_LABELS[member.department]
              : null;
            const metaParts = [
              deptLabel,
              member.designation,
              member.reportingManager
                ? `Reports to ${member.reportingManager.user.name ?? member.reportingManager.user.email.split("@")[0]}`
                : null,
              member.isDepartmentHead ? "Department head" : null,
              ATTENDANCE_WORK_MODE_LABELS[member.attendanceWorkMode],
            ].filter(Boolean);
            const displayName =
              member.user.name ?? member.user.email.split("@")[0];
            const joinedLabel = member.joinedAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "2-digit",
            });

            if (isEditing) {
              return (
                <article className="saas-team-card saas-team-card-edit" key={member.id}>
                  <MemberEditForm
                    member={member}
                    members={members}
                    onCancel={() => setEditingId(null)}
                    orgAllowedModules={orgAllowedModules}
                  />
                </article>
              );
            }

            const canEditMember = canManage && !isSelf;

            return (
              <article
                className={`saas-team-card${canEditMember ? " saas-team-card-editable" : ""}`}
                key={member.id}
                onClick={
                  canEditMember
                    ? () => openEdit(member.id)
                    : undefined
                }
                onKeyDown={
                  canEditMember
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openEdit(member.id);
                        }
                      }
                    : undefined
                }
                role={canEditMember ? "button" : undefined}
                tabIndex={canEditMember ? 0 : undefined}
              >
                <div className="saas-team-card-top">
                  <div className="saas-team-card-identity">
                    <span aria-hidden className="crm-avatar sm saas-team-card-avatar">
                      {memberInitials(member.user.name, member.user.email)}
                    </span>
                    <div className="saas-team-card-copy">
                      <div className="saas-team-card-name">
                        <strong>{displayName}</strong>
                        {isSelf ? <em className="saas-you-badge">You</em> : null}
                      </div>
                      {metaParts.length > 0 ? (
                        <p className="saas-team-card-meta">
                          {metaParts.join(META_SEPARATOR)}
                        </p>
                      ) : null}
                      <p className="saas-team-card-email">{member.user.email}</p>
                      <WorkspaceModulePills modules={member.modules} />
                    </div>
                  </div>
                  <span className={`saas-role-pill role-${member.role.toLowerCase()}`}>
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>

                <div
                  className="saas-team-card-footer"
                  onClick={(event) => event.stopPropagation()}
                >
                  <span className="saas-team-card-joined">Joined {joinedLabel}</span>
                  <div className="saas-member-tools">
                    <MemberContactLinks
                      email={member.user.email}
                      phone={member.user.phone}
                    />
                    {canEditMember ? (
                      <>
                        <button
                          aria-label={`Edit ${displayName}`}
                          className="btn-icon btn-icon-edit"
                          title="Edit member"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(member.id);
                          }}
                        >
                          <Pencil aria-hidden size={15} strokeWidth={2.25} />
                        </button>
                        <button
                          aria-label={`Reset password for ${displayName}`}
                          className="btn-icon btn-icon-reset"
                          disabled={pending}
                          title="Reset password"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            resetPassword(member.id);
                          }}
                        >
                          <KeyRound aria-hidden size={15} strokeWidth={2.25} />
                        </button>
                        <button
                          aria-label={`Remove ${displayName}`}
                          className="btn-icon btn-icon-remove"
                          disabled={pending}
                          title="Remove member"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeMember(member.id);
                          }}
                        >
                          <Trash2 aria-hidden size={15} strokeWidth={2.25} />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {canManage ? (
        <details
          className="ws-team-collapsible-section saas-team-invite-collapsible"
          open={inviteOpen}
          onToggle={(event) => setInviteOpen(event.currentTarget.open)}
        >
          <summary>
            <span>
              <strong>Add team member</strong>
              <small>
                Creates a login or links an existing Sheetomatic account to your
                workspace.
              </small>
            </span>
          </summary>
          <div className="ws-team-collapsible-body">
            <form
              action={inviteAction}
              className="saas-settings-form saas-team-invite saas-form-panel"
            >
              <h3>Add team member</h3>
              <p className="saas-team-invite-lead">
                Login details are emailed automatically when Resend is configured.
              </p>
              <div className="form-grid-premium">
                <label>
                  Name
                  <input name="name" placeholder="Full name" required type="text" />
                </label>
                <label>
                  Email
                  <input
                    name="email"
                    placeholder="name@company.com"
                    required
                    type="email"
                  />
                </label>
                <label>
                  WhatsApp
                  <input
                    inputMode="tel"
                    name="whatsapp"
                    placeholder="9329103106"
                    type="tel"
                  />
                </label>
                <label>
                  Department
                  <select defaultValue="GENERAL" name="department" required>
                    {departmentOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Designation
                  <input
                    name="designation"
                    placeholder="e.g. Sales Manager"
                    required
                    type="text"
                  />
                </label>
                <label>
                  Role
                  <select
                    defaultValue="STAFF"
                    name="role"
                    required
                    onChange={(event) =>
                      setInviteRole(event.target.value as Role)
                    }
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Reporting manager
                  <select
                    defaultValue=""
                    name="reportingManagerId"
                    required={inviteReportingRequired}
                  >
                    {!inviteReportingRequired ? (
                      <option value="">None (owner)</option>
                    ) : null}
                    <option disabled={inviteReportingRequired} value="">
                      {inviteReportingRequired
                        ? "Select reporting manager"
                        : "None"}
                    </option>
                    {managerOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.user.name ?? option.user.email} ·{" "}
                        {option.user.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field-full ws-attendance-check">
                  <input name="isDepartmentHead" type="checkbox" />
                  <span>
                    Department head (can view this department&apos;s team)
                  </span>
                </label>
                <label className="form-field-full">
                  Initial password
                  <input
                    autoComplete="new-password"
                    minLength={8}
                    name="initialPassword"
                    placeholder="Leave blank to auto-generate"
                    type="text"
                  />
                </label>
              </div>

              <WorkspaceModuleFields
                orgAllowedModules={orgAllowedModules}
                role={inviteRole}
              />
              <div className="form-actions">
                <button
                  className="btn-cta btn-primary"
                  disabled={invitePending || pending}
                  type="submit"
                >
                  {invitePending ? "Adding..." : "Add to workspace"}
                </button>
              </div>
              {inviteState.message ? (
                <p
                  className={
                    inviteState.ok
                      ? "saas-form-message ok"
                      : "saas-form-message error"
                  }
                >
                  {inviteState.message}
                </p>
              ) : null}
              {inviteState.ok &&
              (inviteState.emailSent || inviteState.tempPassword) ? (
                <TeamLoginCredentials
                  email={inviteState.loginEmail}
                  emailSent={inviteState.emailSent}
                  password={inviteState.tempPassword}
                />
              ) : null}
            </form>
          </div>
        </details>
      ) : null}
    </div>
  );
}
