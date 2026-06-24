"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UserPlus } from "lucide-react";
import { inviteTeamMember, type TeamActionState } from "@/app/app/team/actions";
import type { FmsAssignableMember } from "@/lib/fms/flow-owner-resolve";
import { ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@prisma/client";

const ADD_MEMBER_VALUE = "__add_fms_step_owner__";
const inviteInitialState: TeamActionState = { ok: false, message: "" };

export type FmsStepOwnerMember = FmsAssignableMember;

export function FmsStepOwnerField({
  value,
  onChange,
  members,
  onMembersChange,
  label = "Step owner",
  compact = false,
}: {
  value: string;
  onChange: (userId: string) => void;
  members: FmsStepOwnerMember[];
  onMembersChange: (members: FmsStepOwnerMember[]) => void;
  label?: string;
  compact?: boolean;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const assignedInviteRef = useRef<string | null>(null);
  const [inviteState, inviteAction, invitePending] = useActionState(
    inviteTeamMember,
    inviteInitialState,
  );

  useEffect(() => {
    if (!inviteState.ok || !inviteState.userId) {
      return;
    }
    if (assignedInviteRef.current === inviteState.userId) {
      return;
    }
    assignedInviteRef.current = inviteState.userId;
    const nextMember: FmsStepOwnerMember = {
      id: inviteState.userId,
      name: inviteState.userName ?? inviteState.loginEmail?.split("@")[0] ?? "Member",
      email: inviteState.loginEmail ?? "",
      role: "STAFF",
    };
    const exists = members.some((member) => member.id === nextMember.id);
    if (!exists) {
      onMembersChange([...members, nextMember]);
    }
    onChange(inviteState.userId);
    setShowAddForm(false);
  }, [
    inviteState.ok,
    inviteState.userId,
    inviteState.userName,
    inviteState.loginEmail,
    members,
    onChange,
    onMembersChange,
  ]);

  function handleSelectChange(nextValue: string) {
    if (nextValue === ADD_MEMBER_VALUE) {
      setShowAddForm(true);
      return;
    }
    onChange(nextValue);
    setShowAddForm(false);
  }

  return (
    <div className={`ws-fms-step-owner-field${compact ? " is-compact" : ""}`}>
      {label ? (
        <label className="ws-fms-jf-option-field">
          {label}
          <select
            value={value}
            onChange={(event) => handleSelectChange(event.target.value)}
          >
            <option value="">Select step owner...</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
            <option value={ADD_MEMBER_VALUE}>+ Add new team member</option>
          </select>
        </label>
      ) : (
        <select
          aria-label="Step owner"
          className="ws-fms-step-owner-select"
          value={value}
          onChange={(event) => handleSelectChange(event.target.value)}
        >
          <option value="">Select step owner...</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
          <option value={ADD_MEMBER_VALUE}>+ Add new team member</option>
        </select>
      )}

      {!value && !showAddForm ? (
        <button
          type="button"
          className="ws-fms-step-owner-add-link"
          onClick={() => setShowAddForm(true)}
        >
          <UserPlus size={14} aria-hidden />
          Not in team? Add step owner here
        </button>
      ) : null}

      {showAddForm ? (
        <div className="ws-fms-step-owner-add-panel">
          <p className="ws-fms-step-owner-add-lead">
            Add someone to your workspace and assign them to this stop. Set TAT
            below after they are assigned.
          </p>
          <form action={inviteAction} className="ws-fms-step-owner-add-form">
            <input name="department" type="hidden" value="GENERAL" />
            <input name="modules" type="hidden" value="FMS" />
            <div className="ws-fms-step-owner-add-grid">
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
                Designation
                <input
                  defaultValue="FMS team"
                  name="designation"
                  required
                  type="text"
                />
              </label>
              <label>
                Role
                <select defaultValue="STAFF" name="role">
                  {(["STAFF", "MANAGER", "ADMIN"] as Role[]).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="ws-fms-step-owner-add-actions">
              <button
                className="btn-primary btn-sm"
                disabled={invitePending}
                type="submit"
              >
                {invitePending ? "Adding..." : "Add & assign to step"}
              </button>
              <button
                className="btn-secondary btn-sm"
                type="button"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
            {inviteState.message ? (
              <p
                className={
                  inviteState.ok ? "ws-form-success" : "ws-form-error"
                }
              >
                {inviteState.message}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
