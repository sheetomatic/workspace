"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteHrShiftAction, saveHrShiftAction } from "@/lib/hr/hr-actions";
import { HrFeedbackBanner } from "@/components/hr/hr-feedback";

export type HrShiftRow = {
  id: string;
  name: string;
  code: string | null;
  startTime: string;
  endTime: string;
  isDefault: boolean;
  isActive: boolean;
};

export function HrShiftsPanel({ shifts }: { shifts: HrShiftRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [addFormKey, setAddFormKey] = useState(0);

  function onSave(formData: FormData) {
    const isAdd = !String(formData.get("id") ?? "").trim();
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await saveHrShiftAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Shift saved.");
      setIsError(false);
      if (isAdd) {
        setAddFormKey((key) => key + 1);
      }
      router.refresh();
    });
  }

  function onDelete(shiftId: string) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await deleteHrShiftAction(shiftId);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Shift deleted.");
      setIsError(false);
      router.refresh();
    });
  }

  return (
    <section className="saas-form-panel ws-workplace-hr-settings">
      <h3>Shifts &amp; timing</h3>
      <p className="saas-team-invite-lead">
        Define General, Morning, Night (or custom) shifts. Assign a shift on each
        employee profile — late, half day, short leave, and Blue OT use that
        timing. Org default work hours apply when no shift is assigned.
      </p>
      <HrFeedbackBanner message={message} isError={isError} />

      {shifts.length > 0 ? (
        <ul className="ws-hr-sites-list">
          {shifts.map((shift) => (
            <li key={shift.id} className="ws-hr-site-item">
              <form action={onSave} className="ws-hr-form ws-hr-site-form">
                <input name="id" type="hidden" value={shift.id} />
                <div className="form-grid-premium">
                  <label>
                    Shift name
                    <input name="name" defaultValue={shift.name} required />
                  </label>
                  <label>
                    Code
                    <input
                      name="code"
                      defaultValue={shift.code ?? ""}
                      placeholder="GEN / MOR / NIGHT"
                    />
                  </label>
                  <label>
                    Start
                    <input
                      name="startTime"
                      type="time"
                      defaultValue={shift.startTime}
                      required
                    />
                  </label>
                  <label>
                    End
                    <input
                      name="endTime"
                      type="time"
                      defaultValue={shift.endTime}
                      required
                    />
                  </label>
                </div>
                <label className="ws-hr-checkbox">
                  <input
                    name="isDefault"
                    type="checkbox"
                    defaultChecked={shift.isDefault}
                  />
                  Default shift (fallback when employee has none)
                </label>
                <label className="ws-hr-checkbox">
                  <input
                    name="isActive"
                    type="checkbox"
                    defaultChecked={shift.isActive}
                  />
                  Active
                </label>
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-secondary btn-sm"
                    disabled={pending}
                  >
                    Save shift
                  </button>
                </div>
              </form>
              <div className="ws-hr-site-delete">
                <button
                  type="button"
                  className="btn-secondary btn-sm danger"
                  disabled={pending}
                  onClick={() => onDelete(shift.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ws-hr-help">No shifts yet. Add General / Morning / Night below.</p>
      )}

      <form
        key={addFormKey}
        action={onSave}
        className="ws-hr-form ws-hr-site-add"
      >
        <h4>Add shift</h4>
        <div className="form-grid-premium">
          <label>
            Shift name
            <input name="name" placeholder="Morning / Night / General" required />
          </label>
          <label>
            Code
            <input name="code" placeholder="MOR" />
          </label>
          <label>
            Start
            <input name="startTime" type="time" defaultValue="09:30" required />
          </label>
          <label>
            End
            <input name="endTime" type="time" defaultValue="18:30" required />
          </label>
        </div>
        <label className="ws-hr-checkbox">
          <input name="isDefault" type="checkbox" />
          Make this the default shift
        </label>
        <div className="form-actions">
          <button
            type="submit"
            className="btn-cta btn-primary"
            disabled={pending}
          >
            {pending ? "Saving…" : "Add shift"}
          </button>
        </div>
      </form>
    </section>
  );
}
