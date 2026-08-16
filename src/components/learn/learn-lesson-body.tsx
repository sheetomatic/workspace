import { toLessonEmbedUrl } from "@/lib/learn/media";

export function LearnLessonBody({
  goal,
  practicePrompt,
  bodyMd,
  videoUrl,
  embedUrl,
}: {
  goal: string;
  practicePrompt: string;
  bodyMd: string;
  videoUrl: string | null;
  embedUrl: string | null;
}) {
  const watch = toLessonEmbedUrl(videoUrl);
  const sheet = toLessonEmbedUrl(embedUrl);
  const empty =
    !goal.trim() &&
    !practicePrompt.trim() &&
    !bodyMd.trim() &&
    !videoUrl &&
    !embedUrl;

  if (empty) {
    return (
      <p className="learn-muted">
        Your trainer has not written this lesson yet. After the live class, the
        recording and notes will appear here.
      </p>
    );
  }

  return (
    <div className="learn-teach">
      {goal.trim() ? (
        <section>
          <h2>Today&apos;s outcome</h2>
          <p>{goal}</p>
        </section>
      ) : null}

      {watch ? (
        <section>
          <h2>Watch me teach</h2>
          <iframe
            title="Lesson recording"
            src={watch}
            className="learn-embed"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
          {videoUrl ? (
            <p>
              <a href={videoUrl} target="_blank" rel="noreferrer">
                Open recording
              </a>
            </p>
          ) : null}
        </section>
      ) : null}

      {practicePrompt.trim() || sheet ? (
        <section>
          <h2>Do it with me</h2>
          {practicePrompt.trim() ? <p>{practicePrompt}</p> : null}
          {sheet ? (
            <iframe
              title="Practice sheet"
              src={sheet}
              className="learn-embed"
              allow="fullscreen"
            />
          ) : null}
          {embedUrl ? (
            <p>
              <a href={embedUrl} target="_blank" rel="noreferrer">
                Open the practice sheet
              </a>
            </p>
          ) : null}
        </section>
      ) : null}

      {bodyMd.trim() ? (
        <section>
          <h2>How I explain it</h2>
          <pre>{bodyMd}</pre>
        </section>
      ) : null}
    </div>
  );
}
