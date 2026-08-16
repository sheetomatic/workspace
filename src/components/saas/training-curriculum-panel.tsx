"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TrainingTrackId } from "@prisma/client";
import {
  createTrainingLessonAction,
  saveTrainingLessonAction,
} from "@/app/app/leads/training-content-actions";
import { TRACK_LABEL } from "@/lib/learn/catalog";
import { lessonHasTeachingContent } from "@/lib/learn/media";
import { MSME_FIRM } from "@/lib/learn/msme-workbook";

export type CurriculumLessonView = {
  id: string;
  slug: string;
  title: string;
  moduleLabel: string;
  summary: string;
  goal: string;
  practicePrompt: string;
  bodyMd: string;
  videoUrl: string | null;
  embedUrl: string | null;
  published: boolean;
  sortOrder: number;
};

export type CurriculumCourseView = {
  id: string;
  track: TrainingTrackId;
  title: string;
  summary: string;
  lessons: CurriculumLessonView[];
};

export function TrainingCurriculumPanel({
  courses,
  canManage,
  initialLessonId,
  copyUrl,
}: {
  courses: CurriculumCourseView[];
  canManage: boolean;
  initialLessonId?: string;
  copyUrl?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [track, setTrack] = useState<TrainingTrackId>(
    courses[0]?.track ?? "SHEETS",
  );
  const [lessonId, setLessonId] = useState(
    initialLessonId || courses[0]?.lessons[0]?.id || "",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const course = courses.find((item) => item.track === track) ?? courses[0];
  const lesson = useMemo(
    () => course?.lessons.find((item) => item.id === lessonId) ?? course?.lessons[0],
    [course, lessonId],
  );

  const modules = useMemo(() => {
    const groups = new Map<string, CurriculumLessonView[]>();
    for (const item of course?.lessons ?? []) {
      const key = item.moduleLabel || "Lessons";
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [course]);

  function run(work: () => Promise<{ ok: boolean; message: string; lessonId?: string }>) {
    startTransition(async () => {
      setNotice(null);
      setError(null);
      const result = await work();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(result.message);
      if (result.lessonId) setLessonId(result.lessonId);
      router.refresh();
    });
  }

  if (!course) {
    return <p className="ws-apple-record-empty">Curriculum is not seeded yet.</p>;
  }

  return (
    <div className="training-curriculum">
      {error ? <p className="training-banner is-error">{error}</p> : null}
      {notice ? <p className="training-banner is-ok">{notice}</p> : null}

      {course.track === "SHEETS" ? (
        <aside className="training-workbook-bar">
          <div>
            <strong>Practice workbook — {MSME_FIRM.name}</strong>
            <span>
              Big MSME file: 1,000+ sales lines, lookups, dashboard, ageing,
              GST. Students copy this, then each topic applies a formula on the
              same shop.
            </span>
          </div>
          <div>
            {copyUrl ? (
              <a
                className="ws-btn ws-btn-primary"
                href={copyUrl}
                target="_blank"
                rel="noreferrer"
              >
                Copy to Google Sheets
              </a>
            ) : null}
            <a className="ws-btn ws-btn-primary" href="/api/learn/samples/workbook">
              Download Excel — open in Google Sheets
            </a>
          </div>
        </aside>
      ) : null}

      <div className="training-track-switch">
        {courses.map((item) => (
          <button
            key={item.track}
            type="button"
            className={item.track === course.track ? "is-active" : ""}
            onClick={() => {
              setTrack(item.track);
              setLessonId(item.lessons[0]?.id ?? "");
            }}
          >
            {TRACK_LABEL[item.track]}
          </button>
        ))}
      </div>

      <p className="training-curriculum-lead">{course.summary}</p>

      {canManage ? (
        <form
          className="training-add-lesson"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            run(async () => {
              const result = await createTrainingLessonAction(data);
              if (result.ok) form.reset();
              return result;
            });
          }}
        >
          <input type="hidden" name="track" value={course.track} />
          <input name="title" required placeholder="New lesson title" />
          <input name="moduleLabel" placeholder="Module (e.g. Advanced)" />
          <button type="submit" className="ws-btn ws-btn-secondary" disabled={pending}>
            {pending ? "Adding…" : "Add lesson"}
          </button>
        </form>
      ) : null}

      <div className="training-curriculum-grid">
        <aside className="training-lesson-nav">
          {modules.map(([moduleLabel, lessons]) => (
            <section key={moduleLabel}>
              <h3>{moduleLabel}</h3>
              <ul>
                {lessons.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={item.id === lesson?.id ? "is-active" : ""}
                      onClick={() => setLessonId(item.id)}
                    >
                      <strong>{item.title}</strong>
                      <em>
                        {item.published ? "Live" : "Draft"}
                        {lessonHasTeachingContent(item) ? " · written" : ""}
                      </em>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </aside>

        {lesson && canManage ? (
          <form
            key={lesson.id}
            className="training-lesson-editor"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              run(() => saveTrainingLessonAction(data));
            }}
          >
            <input type="hidden" name="lessonId" value={lesson.id} />
            <p className="training-editor-kicker">Your teaching template</p>
            <h2>Write this lesson the way you teach it</h2>
            <p className="training-curriculum-lead">
              Outcome → watch you teach → do it in the sheet → your notes.
              Students see these same blocks on Learn.
            </p>

            <label>
              Title
              <input name="title" required defaultValue={lesson.title} />
            </label>
            <div className="training-editor-row">
              <label>
                Module
                <input name="moduleLabel" defaultValue={lesson.moduleLabel} />
              </label>
              <label className="training-publish">
                <input
                  name="published"
                  type="checkbox"
                  value="1"
                  defaultChecked={lesson.published}
                />
                Publish to students
              </label>
            </div>
            <label>
              One-line summary
              <input name="summary" defaultValue={lesson.summary} />
            </label>
            <label>
              Today&apos;s outcome
              <textarea
                name="goal"
                rows={2}
                defaultValue={lesson.goal}
                placeholder="After this, you can look up a rate from another sheet without breaking the formula."
              />
            </label>
            <label>
              Watch me teach — recording / YouTube
              <input
                name="videoUrl"
                type="url"
                defaultValue={lesson.videoUrl ?? ""}
                placeholder="https://youtu.be/… or Drive recording"
              />
            </label>
            <label>
              Do it with me — practice sheet
              <input
                name="embedUrl"
                type="url"
                defaultValue={lesson.embedUrl ?? ""}
                placeholder="https://docs.google.com/spreadsheets/d/…"
              />
            </label>
            <label>
              Practice task
              <textarea
                name="practicePrompt"
                rows={3}
                defaultValue={lesson.practicePrompt}
                placeholder="Open the sheet. In D2 write VLOOKUP. Fill the GST column for 10 rows. Do not copy-paste values."
              />
            </label>
            <label>
              How I explain it
              <textarea
                name="bodyMd"
                rows={8}
                defaultValue={lesson.bodyMd}
                placeholder="Write in your voice. The mistake students make, the demo you run, the client example."
              />
            </label>
            <button type="submit" className="ws-btn ws-btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save lesson"}
            </button>
          </form>
        ) : lesson ? (
          <article className="training-lesson-editor">
            <h2>{lesson.title}</h2>
            <p>{lesson.summary}</p>
          </article>
        ) : (
          <p className="ws-apple-record-empty">Select a lesson.</p>
        )}
      </div>
    </div>
  );
}
