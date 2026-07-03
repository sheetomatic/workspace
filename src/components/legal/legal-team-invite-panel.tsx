"use client";

import { Suspense, useActionState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { inviteTeamMember, type TeamActionState } from "@/app/app/team/actions";
import { ROLE_LABELS } from "@/lib/permissions";

const initialState: TeamActionState = { ok: false, message: "" };

function LegalTeamInviteForm({
  reportingManagerId,
  onClose,
}: {
  reportingManagerId: string | null;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(inviteTeamMember, initialState);

  return (
    <form action={action} className="legal-team-invite-form saas-form-panel">
      <h3>New team member</h3>
      <p className="legal-create-lead">
        Creates a login with Cases access. Staff code is used for case assignment
        (e.g. SHYAM, MT).
      </p>
      <input name="department" type="hidden" value="ADMIN" />
      <input name="designation" type="hidden" value="Case team" />
      <input name="modules" type="hidden" value="CASES" />
      {reportingManagerId ? (
        <input
          name="reportingManagerId"
          type="hidden"
          value={reportingManagerId}
        />
      ) : null}
      <div className="form-grid-premium">
        <label>
          Name
          <input name="name" placeholder="Full name" required type="text" />
        </label>
        <label>
          Email
          <input
            name="email"
            placeholder="name@hingorani.demo"
            required
            type="email"
          />
        </label>
        <label>
          Staff code
          <input name="staffCode" placeholder="SHYAM" required type="text" />
        </label>
        <label>
          Role
          <select defaultValue="STAFF" name="role" required>
            <option value="STAFF">{ROLE_LABELS.STAFF}</option>
            <option value="MANAGER">{ROLE_LABELS.MANAGER}</option>
            <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
          </select>
        </label>
        <label>
          WhatsApp
          <input inputMode="tel" name="whatsapp" placeholder="9329103106" type="tel" />
        </label>
        <label>
          Initial password
          <input
            minLength={8}
            name="initialPassword"
            placeholder="Leave blank to auto-generate"
            type="text"
          />
        </label>
      </div>
      <div className="form-actions">
        <button className="btn-cta btn-primary" disabled={pending} type="submit">
          {pending ? "Adding..." : "Add member"}
        </button>
        <button className="btn-cta btn-ghost" type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
      {state.message ? (
        <p className={state.ok ? "saas-form-message ok" : "saas-form-message error"}>
          {state.message}
        </p>
      ) : null}
      {state.ok && state.loginEmail ? (
        <p className="saas-form-message ok">
          Login: {state.loginEmail}
          {state.tempPassword ? ` / Password: ${state.tempPassword}` : ""}
        </p>
      ) : null}
    </form>
  );
}

function NewLegalTeamMemberTrigger() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOpen = searchParams.get("invite") === "1";

  if (isOpen) {
    return null;
  }

  function openInvite() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("invite", "1");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <button
      className="btn-cta btn-primary legal-new-team-trigger"
      type="button"
      onClick={openInvite}
    >
      <Plus aria-hidden size={18} strokeWidth={2.25} />
      New team member
    </button>
  );
}

function LegalTeamInvitePanelInner({
  reportingManagerId,
}: {
  reportingManagerId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOpen = searchParams.get("invite") === "1";

  if (!isOpen) {
    return null;
  }

  function closeInvite() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("invite");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="legal-create-overlay">
      <div className="legal-create-dialog">
        <button
          aria-label="Close"
          className="legal-create-close"
          type="button"
          onClick={closeInvite}
        >
          <X size={18} />
        </button>
        <LegalTeamInviteForm
          onClose={closeInvite}
          reportingManagerId={reportingManagerId}
        />
      </div>
    </div>
  );
}

export function LegalTeamPageActions() {
  return (
    <Suspense fallback={<div aria-hidden className="legal-page-actions-shell" />}>
      <NewLegalTeamMemberTrigger />
    </Suspense>
  );
}

export function LegalTeamInvitePanel({
  reportingManagerId,
}: {
  reportingManagerId: string | null;
}) {
  return (
    <Suspense fallback={null}>
      <LegalTeamInvitePanelInner reportingManagerId={reportingManagerId} />
    </Suspense>
  );
}
