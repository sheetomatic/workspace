"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CalendarRange, ListTodo } from "lucide-react";
import type { PcWorkItem } from "@/lib/checklists/pc-work";
import type { PcPeriod } from "@/lib/checklists/pc-period";
import { PcStatusPill, PcWorkKindBadge } from "@/components/saas/pc-work-badges";
import {
  markPcJobDone,
  recordPcFollowUp,
  type PcJobActionState,
} from "@/app/app/pc/actions";

type Member = { id: string; name: string | null; email: string; phone: string | null };

function formatStamp(value: Date | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
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
    <div className="ws-pc-chase-actions">
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
      <Link href={item.href} className="ws-pc-open-btn">
        Open
      </Link>
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

export function PcDoerJobsBoard({
  items,
  members,
  scopeLabel,
}: {
  items: PcWorkItem[];
  members: Member[];
  scopeLabel: string;
  period: PcPeriod;
}) {
  const groups = new Map<string, { label: string; phone: string | null; items: PcWorkItem[] }>();
  for (const item of items) {
    const key = item.ownerId ?? `unassigned:${item.owner}`;
    const member = item.ownerId
      ? members.find((row) => row.id === item.ownerId)
      : undefined;
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

  const doers = [...groups.entries()].sort((a, b) =>
    a[1].label.localeCompare(b[1].label),
  );

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
        const waHref = group.phone
          ? `https://wa.me/${group.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
              `PC follow-up: please close your ${pending} pending job(s) on Sheetomatic.`,
            )}`
          : null;
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
              {waHref ? (
                <a className="btn-secondary btn-sm" href={waHref} target="_blank" rel="noreferrer">
                  WhatsApp doer
                </a>
              ) : null}
            </header>
            <ul className="ws-pc-doer-list">
              {group.items.map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className={item.overdue ? "is-overdue" : undefined}
                >
                  <div className="ws-pc-doer-item-main">
                    <div className="ws-pc-work-card-head">
                      <PcWorkKindBadge kind={item.kind} />
                      <PcStatusPill status={item.status} overdue={item.overdue} />
                      {item.pcJobDoneAt ? (
                        <span className="ws-pc-status-pill is-done">PC done</span>
                      ) : null}
                    </div>
                    <h3>{item.title}</h3>
                    {item.subtitle ? <p className="ws-pc-work-card-sub">{item.subtitle}</p> : null}
                    <p className="ws-pc-work-card-due">Due {item.dueLabel}</p>
                    {item.lastFollowedAt ? (
                      <p className="ws-pc-work-card-due">
                        Last follow-up {formatStamp(item.lastFollowedAt)}
                      </p>
                    ) : null}
                  </div>
                  <PcChaseButtons item={item} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="ws-em-section-lead">
        <CalendarRange size={14} aria-hidden /> Follow up with the doer, then mark{" "}
        <strong>PC done</strong> when your chase for this job is complete. The doer still owns
        Planned / Actual close.
      </p>
    </div>
  );
}
