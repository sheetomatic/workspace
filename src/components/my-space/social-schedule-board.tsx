"use client";

import { useMemo, useState } from "react";
import { socialScheduleAction } from "@/app/app/my-space/social/actions";
import {
  SOCIAL_SLOT_LABELS,
  type SocialPost,
  type SocialSchedule,
} from "@/lib/my-space/social/types";
import "./social-schedule-board.css";

const STATUS_LABEL: Record<string, string> = {
  pending_approval: "Pending",
  approved: "Approved",
  needs_improvement: "Improve",
  posted: "Posted",
};

export function SocialScheduleBoard({ schedule }: { schedule: SocialSchedule }) {
  const [selectedId, setSelectedId] = useState(schedule.posts[0]?.id ?? "");
  const [dayFilter, setDayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [improveNote, setImproveNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const days = useMemo(
    () => [...new Set(schedule.posts.map((p) => p.date))],
    [schedule.posts],
  );

  const filtered = useMemo(() => {
    return schedule.posts.filter((p) => {
      if (dayFilter !== "all" && p.date !== dayFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [schedule.posts, dayFilter, statusFilter]);

  const selected =
    schedule.posts.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  const counts = useMemo(() => {
    const c = {
      pending_approval: 0,
      approved: 0,
      needs_improvement: 0,
      posted: 0,
    };
    for (const p of schedule.posts) c[p.status] += 1;
    return c;
  }, [schedule.posts]);

  async function run(action: string, post: SocialPost) {
    if (action === "improve" && !improveNote.trim()) {
      setError("Write what to improve before submitting");
      return;
    }
    setPending(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("postId", post.id);
      fd.set("action", action);
      fd.set("feedback", improveNote);
      await socialScheduleAction(fd);
      setImproveNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ssb">
      <div className="ssb-stats" aria-label="Schedule counts">
        <span className="ssb-stat pending">{counts.pending_approval} pending</span>
        <span className="ssb-stat approved">{counts.approved} approved</span>
        <span className="ssb-stat improve">{counts.needs_improvement} improve</span>
        <span className="ssb-stat posted">{counts.posted} posted</span>
      </div>

      {error ? <div className="ssb-banner">{error}</div> : null}

      <div className="ssb-filters">
        <label>
          Day
          <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}>
            <option value="all">All days</option>
            {days.map((d) => {
              const sample = schedule.posts.find((p) => p.date === d);
              return (
                <option key={d} value={d}>
                  {sample?.day} {d.slice(5)}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending_approval">Pending approval</option>
            <option value="approved">Approved</option>
            <option value="needs_improvement">Needs improvement</option>
            <option value="posted">Posted</option>
          </select>
        </label>
      </div>

      <div className="ssb-layout">
        <section className="ssb-grid" aria-label="Schedule grid">
          {filtered.map((post) => (
            <button
              key={post.id}
              type="button"
              className={`ssb-card status-${post.status} ${selected?.id === post.id ? "active" : ""}`}
              onClick={() => setSelectedId(post.id)}
            >
              <div className="ssb-card-top">
                <span>
                  {post.day} · {SOCIAL_SLOT_LABELS[post.time] ?? post.time}
                </span>
                <span className={`ssb-pill ${post.status}`}>
                  {STATUS_LABEL[post.status]}
                </span>
              </div>
              <strong>{post.title}</strong>
              <em>{post.pillar}</em>
            </button>
          ))}
        </section>

        <aside className="ssb-detail">
          {selected ? (
            <>
              <div className="ssb-detail-head">
                <div>
                  <p className="ssb-eyebrow">
                    {selected.day} {selected.date} ·{" "}
                    {SOCIAL_SLOT_LABELS[selected.time]}
                  </p>
                  <h2>{selected.title}</h2>
                  <p className="ssb-sub">Pillar: {selected.pillar}</p>
                </div>
                <span className={`ssb-pill ${selected.status}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>

              <div className="ssb-creative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.creative}
                  alt={selected.title}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (next) next.hidden = false;
                  }}
                />
                <div className="ssb-creative-fallback" hidden>
                  Creative pending — caption ready for approval.
                </div>
              </div>

              <label className="ssb-label">Caption</label>
              <pre className="ssb-caption">{selected.caption}</pre>

              {selected.feedback ? (
                <div className="ssb-feedback">
                  <strong>Improvement note</strong>
                  <p>{selected.feedback}</p>
                </div>
              ) : null}

              <label className="ssb-label" htmlFor="ssb-improve">
                Ask for improvement
              </label>
              <textarea
                id="ssb-improve"
                rows={3}
                placeholder="e.g. Shorter hook, more Hinglish, change CTA…"
                value={improveNote}
                onChange={(e) => setImproveNote(e.target.value)}
              />

              <div className="ssb-actions">
                <button
                  type="button"
                  className="ws-btn ws-btn-primary"
                  disabled={
                    pending ||
                    selected.status === "approved" ||
                    selected.status === "posted"
                  }
                  onClick={() => void run("approve", selected)}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="ws-btn ws-btn-secondary"
                  disabled={pending}
                  onClick={() => void run("improve", selected)}
                >
                  Ask improvement
                </button>
                <button
                  type="button"
                  className="ws-btn ws-btn-ghost"
                  disabled={pending || selected.status !== "approved"}
                  onClick={() => void run("posted", selected)}
                >
                  Mark posted
                </button>
                <button
                  type="button"
                  className="ws-btn ws-btn-ghost"
                  disabled={pending}
                  onClick={() => void run("reset", selected)}
                >
                  Reset
                </button>
              </div>

              <p className="ssb-note">
                Sam posts on LinkedIn only after status is <strong>Approved</strong>.
                Cadence: 8 AM · 11 AM · 4 PM · 9 PM IST.
              </p>
            </>
          ) : (
            <p className="ssb-sub">Select a slot to review.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
