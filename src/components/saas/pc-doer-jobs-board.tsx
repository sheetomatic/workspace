"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, ListTodo, Pencil, Upload, X } from "lucide-react";
import type { PcWorkItem } from "@/lib/checklists/pc-work";
import type { PcPeriod } from "@/lib/checklists/pc-period";
import { PcStatusPill, PcWorkKindBadge } from "@/components/saas/pc-work-badges";
import { AiVoiceTextarea } from "@/components/saas/ai-voice-textarea";
import {
  completePcDoerWorkAction,
  markPcJobDone,
  recordPcFollowUp,
  type PcJobActionState,
} from "@/app/app/pc/actions";
import {
  deleteChecklistTemplateAction,
  updateChecklistOccurrenceAction,
  updateChecklistTemplateAction,
} from "@/app/app/checklists/actions";
import { fmsInitialState } from "@/lib/fms-action-state";

type Member = { id: string; name: string | null; email: string; phone: string | null };

function formatStamp(value: Date | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function TickDoerDone({ item, disabled }: { item: PcWorkItem; disabled: boolean }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    completePcDoerWorkAction,
    { ok: false, message: "" },
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="ws-cl-tick-form">
      <input type="hidden" name="kind" value={item.kind} />
      <input type="hidden" name="workId" value={item.id} />
      <label className="ws-cl-tick">
        <input
          aria-label="Mark done"
          disabled={disabled || pending || !item.completable}
          type="checkbox"
          onChange={(event) => {
            if (event.currentTarget.checked) event.currentTarget.form?.requestSubmit();
          }}
        />
      </label>
      {state.message && !state.ok ? (
        <span className="ws-form-error">{state.message}</span>
      ) : null}
    </form>
  );
}

function PcChaseButtons({ item }: { item: PcWorkItem }) {
  const [followState, followAction, followPending] = useActionState<
    PcJobActionState,
    FormData
  >(recordPcFollowUp, { ok: false, message: "" });
  const [doneState, doneAction, donePending] = useActionState<
    PcJobActionState,
    FormData
  >(markPcJobDone, { ok: false, message: "" });

  return (
    <div className="ws-cl-row-actions">
      <form action={followAction}>
        <input type="hidden" name="kind" value={item.kind} />
        <input type="hidden" name="workId" value={item.id} />
        <button className="btn-secondary btn-sm" type="submit" disabled={followPending}>
          {followPending ? "Sending…" : "Follow up"}
        </button>
      </form>
      <form action={doneAction}>
        <input type="hidden" name="kind" value={item.kind} />
        <input type="hidden" name="workId" value={item.id} />
        <button className="btn-primary btn-sm ws-sf-btn-primary" type="submit" disabled={donePending}>
          {donePending ? "Saving…" : "PC done"}
        </button>
      </form>
      {followState.message ? (
        <span className={followState.ok ? "ws-pc-chase-ok" : "ws-pc-chase-err"}>
          {followState.message}
        </span>
      ) : null}
      {doneState.message ? (
        <span className={doneState.ok ? "ws-pc-chase-ok" : "ws-pc-chase-err"}>
          {doneState.message}
        </span>
      ) : null}
    </div>
  );
}

function ChecklistUpdateDialog({
  item,
  onClose,
}: {
  item: PcWorkItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateChecklistOccurrenceAction,
    fmsInitialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
  }, [state.ok, onClose, router]);

  return (
    <div className="ws-cl-dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="ws-cl-dialog" role="dialog" onClick={(event) => event.stopPropagation()}>
        <header>
          <h3>Update {item.title}</h3>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <form action={formAction} className="ws-cl-dialog-form">
          <input name="occurrenceId" type="hidden" value={item.id} />
          <AiVoiceTextarea
            defaultValue={item.notes ?? ""}
            name="notes"
            placeholder="Add notes or proof remarks"
            rows={4}
          />
          <label className="ws-cl-file">
            <Upload size={14} aria-hidden />
            <span>Upload proof if any</span>
            <input name="proof" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
          </label>
          {state.message && !state.ok ? <p className="ws-form-error">{state.message}</p> : null}
          <div className="ws-cl-dialog-actions">
            <button className="btn-secondary" disabled={pending} name="intent" type="submit" value="update">
              Save update
            </button>
            <button className="btn-primary ws-sf-btn-primary" disabled={pending} name="intent" type="submit" value="done">
              Save and mark done
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChecklistEditDialog({
  item,
  members,
  onClose,
}: {
  item: PcWorkItem;
  members: Member[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateChecklistTemplateAction,
    fmsInitialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
  }, [state.ok, onClose, router]);

  if (!item.templateId) return null;

  return (
    <div className="ws-cl-dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="ws-cl-dialog" role="dialog" onClick={(event) => event.stopPropagation()}>
        <header>
          <h3>Edit checklist</h3>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <form action={formAction} className="ws-cl-dialog-form">
          <input name="templateId" type="hidden" value={item.templateId} />
          <label>
            Title
            <input defaultValue={item.title} name="title" required />
          </label>
          <label>
            Doer
            <select defaultValue={item.ownerId ?? ""} name="assigneeUserId">
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name ?? member.email}
                </option>
              ))}
            </select>
          </label>
          {state.message && !state.ok ? <p className="ws-form-error">{state.message}</p> : null}
          <div className="ws-cl-dialog-actions">
            <button className="btn-primary ws-sf-btn-primary" disabled={pending} type="submit">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PcDoerJobsBoard({
  items,
  members,
  scopeLabel,
  currentUserId,
  isAdmin,
}: {
  items: PcWorkItem[];
  members: Member[];
  scopeLabel: string;
  period: PcPeriod;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [updateItem, setUpdateItem] = useState<PcWorkItem | null>(null);
  const [editItem, setEditItem] = useState<PcWorkItem | null>(null);
  const router = useRouter();
  const [deleteState, deleteAction] = useActionState(
    deleteChecklistTemplateAction,
    fmsInitialState,
  );

  useEffect(() => {
    if (deleteState.ok) router.refresh();
  }, [deleteState.ok, router]);

  const groups = new Map<string, { label: string; phone: string | null; items: PcWorkItem[] }>();
  for (const item of items) {
    const key = item.ownerId ?? `unassigned:${item.owner}`;
    const member = item.ownerId ? members.find((row) => row.id === item.ownerId) : undefined;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, {
        label: member?.name ?? item.owner,
        phone: member?.phone ?? null,
        items: [item],
      });
    }
  }

  const doers = [...groups.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label));

  if (items.length === 0) {
    return (
      <div className="ws-empty-state ws-fms-empty-state is-positive ws-pc-all-clear">
        <ListTodo size={28} aria-hidden />
        <h3>All clear for {scopeLabel.toLowerCase()}</h3>
        <p>
          PC chases Check Lists, Task Delegations, and FMS stops — doer-wise — until the owner
          completes the work.
        </p>
      </div>
    );
  }

  return (
    <div className="ws-pc-doer-board">
      {doers.map(([key, group]) => {
        const pending = group.items.filter((row) => !row.pcJobDoneAt).length;
        const overdue = group.items.filter((row) => row.overdue).length;
        return (
          <section key={key} className="ws-pc-doer-card">
            <header className="ws-pc-doer-head">
              <div>
                <h2>{group.label}</h2>
                <p>
                  {pending} to chase
                  {overdue > 0 ? ` · ${overdue} overdue` : ""}
                </p>
              </div>
            </header>
            <div className="ws-sf-table-wrap ws-cl-task-wrap">
              <table className="ws-fms-data-table ws-sf-data-table ws-cl-task-table ws-pc-job-table">
                <thead>
                  <tr>
                    <th className="ws-cl-tick-col">Done</th>
                    <th>Job</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => {
                    const canUpdate =
                      isAdmin || (item.ownerId === currentUserId && item.completable);
                    return (
                      <tr key={`${item.kind}-${item.id}`} className={item.overdue ? "is-overdue" : undefined}>
                        <td className="ws-cl-tick-col" data-label="Done">
                          <TickDoerDone disabled={!canUpdate} item={item} />
                        </td>
                        <td data-label="Job">
                          <div className="ws-pc-work-card-head">
                            <PcWorkKindBadge kind={item.kind} />
                            {item.pcJobDoneAt ? (
                              <span className="ws-pc-status-pill is-done">PC done</span>
                            ) : null}
                          </div>
                          <strong>{item.title}</strong>
                          {item.subtitle ? <p className="ws-fms-muted">{item.subtitle}</p> : null}
                        </td>
                        <td data-label="Due">{item.dueLabel}</td>
                        <td data-label="Status">
                          <PcStatusPill status={item.status} overdue={item.overdue} />
                        </td>
                        <td data-label="Actions">
                          <div className="ws-cl-row-actions">
                            {item.kind === "CHECKLIST" && canUpdate ? (
                              <button
                                className="btn-secondary btn-sm"
                                type="button"
                                onClick={() => setUpdateItem(item)}
                              >
                                Update
                              </button>
                            ) : null}
                            <Link href={item.href} className="btn-secondary btn-sm">
                              Open
                            </Link>
                            <PcChaseButtons item={item} />
                            {isAdmin && item.kind === "CHECKLIST" && item.templateId ? (
                              <>
                                <button
                                  className="btn-ghost btn-sm"
                                  type="button"
                                  onClick={() => setEditItem(item)}
                                >
                                  <Pencil size={14} aria-hidden />
                                  Edit
                                </button>
                                <form
                                  action={deleteAction}
                                  onSubmit={(event) => {
                                    if (!window.confirm("Delete this checklist schedule?")) {
                                      event.preventDefault();
                                    }
                                  }}
                                >
                                  <input name="templateId" type="hidden" value={item.templateId} />
                                  <button className="btn-ghost btn-sm ws-cl-danger" type="submit">
                                    Delete
                                  </button>
                                </form>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      <p className="ws-em-section-lead">
        <CalendarRange size={14} aria-hidden /> Doers tick or Update with notes/proof. PC follows
        up, then marks <strong>PC done</strong> when the chase is complete.
      </p>
      {updateItem ? (
        <ChecklistUpdateDialog item={updateItem} onClose={() => setUpdateItem(null)} />
      ) : null}
      {editItem ? (
        <ChecklistEditDialog
          item={editItem}
          members={members}
          onClose={() => setEditItem(null)}
        />
      ) : null}
    </div>
  );
}
