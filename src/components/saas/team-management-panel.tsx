"use client";

import { useActionState, useState, useTransition } from "react";
import { Mail, Pencil, Trash2 } from "lucide-react";
import type { AttendanceWorkMode, Role, TaskDepartment } from "@prisma/client";
import {
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberDetails,
  type TeamActionState,
} from "@/app/app/team/actions";
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
  attendanceWorkMode: AttendanceWorkMode;
  geoFenceRequired: boolean;
  faceRequired: boolean;
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
};

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

function MemberEditForm({
  member,
  onCancel,
}: {
  member: TeamMemberRow;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(
    updateTeamMemberDetails,
    initialState,
  );

  return (
    <form action={action} className="saas-team-edit-form">
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
            placeholder="9685788980"
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
          <select defaultValue={member.role} name="role" required>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
      </div>

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
        <label className="ws-hr-checkbox">
          <input
            defaultChecked={member.geoFenceRequired}
            name="geoFenceRequired"
            type="checkbox"
          />
          Require geo-fenced check-in for this member
        </label>
        <label className="ws-hr-checkbox">
          <input
            defaultChecked={member.faceRequired}
            name="faceRequired"
            type="checkbox"
          />
          Require face verification for this member
        </label>
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
}: {
  members: TeamMemberRow[];
  currentUserId: string;
}) {
  const [inviteState, inviteAction, invitePending] = useActionState(
    inviteTeamMember,
    initialState,
  );
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  function removeMember(membershipId: string) {
    startTransition(async () => {
      await removeTeamMember(membershipId);
      if (editingId === membershipId) {
        setEditingId(null);
      }
    });
  }

  return (
    <div className="saas-team-panel">
      <form action={inviteAction} className="saas-settings-form saas-team-invite saas-form-panel">
        <h3>Add team member</h3>
        <p className="saas-team-invite-lead">
          Department, designation, role, email, and WhatsApp are used for task
          assignments and notifications.
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
              placeholder="9685788980"
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
            <select defaultValue="STAFF" name="role" required>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
        </div>
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
              inviteState.ok ? "saas-form-message ok" : "saas-form-message error"
            }
          >
            {inviteState.message}
          </p>
        ) : null}
      </form>

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
                    onCancel={() => setEditingId(null)}
                  />
                </article>
              );
            }

            return (
              <article className="saas-team-card" key={member.id}>
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
                    </div>
                  </div>
                  <span className={`saas-role-pill role-${member.role.toLowerCase()}`}>
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>

                <div className="saas-team-card-footer">
                  <span className="saas-team-card-joined">Joined {joinedLabel}</span>
                  <div className="saas-member-tools">
                    <MemberContactLinks
                      email={member.user.email}
                      phone={member.user.phone}
                    />
                    {!isSelf ? (
                      <>
                        <button
                          aria-label={`Edit ${displayName}`}
                          className="btn-icon btn-icon-edit"
                          title="Edit"
                          type="button"
                          onClick={() => setEditingId(member.id)}
                        >
                          <Pencil aria-hidden size={15} strokeWidth={2.25} />
                        </button>
                        <button
                          aria-label={`Remove ${displayName}`}
                          className="btn-icon btn-icon-remove"
                          disabled={pending}
                          title="Remove"
                          type="button"
                          onClick={() => removeMember(member.id)}
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
    </div>
  );
}
