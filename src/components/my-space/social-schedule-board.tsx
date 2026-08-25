"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  reloadSocialWeekAction,
  socialScheduleAction,
} from "@/app/app/social/actions";
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

function slidesFor(post: SocialPost): string[] {
  if (post.format === "carousel") {
    return [post.creative, ...post.carousel].filter(Boolean);
  }
  return post.creative ? [post.creative] : [];
}

export function SocialScheduleBoard({ schedule }: { schedule: SocialSchedule }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(schedule.posts[0]?.id ?? "");
  const [dayFilter, setDayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [improveNote, setImproveNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

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

  const slides = selected ? slidesFor(selected) : [];

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

  useEffect(() => {
    setSlideIndex(0);
  }, [selectedId]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight" && slides.length > 1) {
        setSlideIndex((i) => (i + 1) % slides.length);
      }
      if (e.key === "ArrowLeft" && slides.length > 1) {
        setSlideIndex((i) => (i - 1 + slides.length) % slides.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, slides.length]);

  async function run(action: string, post: SocialPost) {
    if (action === "improve" && !improveNote.trim()) {
      setError("Write what to improve — AI will rewrite the caption here");
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
      if (action === "improve") setImproveNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setPending(false);
    }
  }

  async function reloadWeek() {
    if (
      !window.confirm(
        "Reload the full Ramesh shop story week from seed? Approvals on this pack will reset.",
      )
    ) {
      return;
    }
    setPending(true);
    setError("");
    try {
      await reloadSocialWeekAction();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reload failed");
    } finally {
      setPending(false);
    }
  }

  const isVisualOnly = Boolean(selected && !selected.caption.trim());

  return (
    <div className="ssb">
      {schedule.character ? (
        <div className="ssb-premise">
          <strong>Story pack:</strong> {schedule.character}
          {schedule.premise ? <span> · {schedule.premise}</span> : null}
        </div>
      ) : null}

      <div className="ssb-stats" aria-label="Schedule counts">
        <span className="ssb-stat pending">{counts.pending_approval} pending</span>
        <span className="ssb-stat approved">{counts.approved} approved</span>
        <span className="ssb-stat improve">{counts.needs_improvement} improve</span>
        <span className="ssb-stat posted">{counts.posted} posted</span>
        <button
          type="button"
          className="ws-btn ws-btn-ghost"
          disabled={pending}
          onClick={() => void reloadWeek()}
        >
          Reload story week
        </button>
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
              <em>
                {post.pillar}
                {post.format === "carousel"
                  ? ` · Carousel (${1 + post.carousel.length})`
                  : ""}
                {!post.caption.trim() ? " · No text" : ""}
              </em>
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
                    {selected.format === "carousel" ? " · Carousel" : ""}
                  </p>
                  <h2>{selected.title}</h2>
                  <p className="ssb-sub">Pillar: {selected.pillar}</p>
                </div>
                <span className={`ssb-pill ${selected.status}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>

              <button
                type="button"
                className="ssb-creative ssb-creative-btn"
                onClick={() => {
                  setSlideIndex(0);
                  setLightboxOpen(true);
                }}
                aria-label="Open full creative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slides[0] || selected.creative}
                  alt={selected.title}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const next = e.currentTarget
                      .nextElementSibling as HTMLElement | null;
                    if (next) next.hidden = false;
                  }}
                />
                <div className="ssb-creative-fallback" hidden>
                  Creative pending — caption ready for approval.
                </div>
                <span className="ssb-creative-hint">
                  Click for full view
                  {slides.length > 1 ? ` · ${slides.length} slides` : ""}
                </span>
              </button>

              {slides.length > 1 ? (
                <div className="ssb-thumbs" aria-label="Carousel slides">
                  {slides.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      className={`ssb-thumb ${i === slideIndex ? "active" : ""}`}
                      onClick={() => {
                        setSlideIndex(i);
                        setLightboxOpen(true);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Slide ${i + 1}`} />
                    </button>
                  ))}
                </div>
              ) : null}

              <label className="ssb-label">Caption</label>
              {isVisualOnly ? (
                <p className="ssb-visual-only">
                  Sat &amp; Sun: <strong>no LinkedIn caption</strong>. Story text is{" "}
                  <strong>on the carousel slides</strong> — open full image to read.
                </p>
              ) : (
                <pre className="ssb-caption">{selected.caption}</pre>
              )}

              {selected.feedback ? (
                <div className="ssb-feedback">
                  <strong>Last AI / improvement note</strong>
                  <p>{selected.feedback}</p>
                </div>
              ) : null}

              {!isVisualOnly ? (
                <>
                  <label className="ssb-label" htmlFor="ssb-improve">
                    Ask AI to improve (caption updates here)
                  </label>
                  <textarea
                    id="ssb-improve"
                    rows={3}
                    placeholder="e.g. More shop detail, shorter hook, softer CTA…"
                    value={improveNote}
                    onChange={(e) => setImproveNote(e.target.value)}
                    disabled={pending || selected.status === "posted"}
                  />
                </>
              ) : (
                <p className="ssb-note">
                  Weekend = post carousel only (empty caption). Slide copy is inside
                  the images. Approve as-is, or ask Sam for slide rewrites.
                </p>
              )}

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
                {!isVisualOnly ? (
                  <button
                    type="button"
                    className="ws-btn ws-btn-secondary"
                    disabled={pending || selected.status === "posted"}
                    onClick={() => void run("improve", selected)}
                  >
                    {pending ? "AI improving…" : "Improve with AI"}
                  </button>
                ) : null}
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
                Mon–Fri: Hinglish shop stories + image. Sat–Sun: carousel, no text.
                Approve before Sam posts. Cadence 8 AM · 11 AM · 4 PM · 9 PM IST.
              </p>
            </>
          ) : (
            <p className="ssb-sub">Select a slot to review.</p>
          )}
        </aside>
      </div>

      {lightboxOpen && selected && slides.length ? (
        <div
          className="ssb-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Full creative"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="ssb-lightbox-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ssb-lightbox-head">
              <div>
                <p className="ssb-eyebrow">
                  {selected.day} {selected.date} ·{" "}
                  {SOCIAL_SLOT_LABELS[selected.time]}
                  {slides.length > 1
                    ? ` · Slide ${slideIndex + 1}/${slides.length}`
                    : ""}
                </p>
                <h2>{selected.title}</h2>
              </div>
              <button
                type="button"
                className="ws-btn ws-btn-ghost"
                onClick={() => setLightboxOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="ssb-lightbox-stage">
              {slides.length > 1 ? (
                <button
                  type="button"
                  className="ssb-nav prev"
                  onClick={() =>
                    setSlideIndex(
                      (i) => (i - 1 + slides.length) % slides.length,
                    )
                  }
                >
                  ‹
                </button>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="ssb-lightbox-img"
                src={slides[slideIndex]}
                alt={`${selected.title} slide ${slideIndex + 1}`}
              />
              {slides.length > 1 ? (
                <button
                  type="button"
                  className="ssb-nav next"
                  onClick={() =>
                    setSlideIndex((i) => (i + 1) % slides.length)
                  }
                >
                  ›
                </button>
              ) : null}
            </div>
            {!isVisualOnly ? (
              <pre className="ssb-caption ssb-lightbox-caption">
                {selected.caption}
              </pre>
            ) : (
              <p className="ssb-visual-only">No caption — visual carousel post.</p>
            )}
            <div className="ssb-actions">
              {!isVisualOnly ? (
                <button
                  type="button"
                  className="ws-btn ws-btn-secondary"
                  disabled={pending || selected.status === "posted"}
                  onClick={() => void run("improve", selected)}
                >
                  {pending ? "AI improving…" : "Improve with AI"}
                </button>
              ) : null}
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
