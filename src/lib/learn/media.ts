import { normalizeTrainingContentUrl } from "@/lib/courses/session-materials";

export function normalizeLessonMediaUrl(raw: string | null | undefined) {
  return normalizeTrainingContentUrl(raw);
}

/** Turn a watch / share link into an iframe src when we know the host. */
export function toLessonEmbedUrl(raw: string | null | undefined): string | null {
  const url = normalizeLessonMediaUrl(raw);
  if (!url) return null;

  const youtube = url.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([\w-]{6,})/i,
  );
  if (youtube) {
    return `https://www.youtube.com/embed/${youtube[1]}`;
  }

  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (drive) {
    return `https://drive.google.com/file/d/${drive[1]}/preview`;
  }

  const sheet = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/i);
  if (sheet) {
    const gid = url.match(/[?&#]gid=(\d+)/)?.[1];
    return gid
      ? `https://docs.google.com/spreadsheets/d/${sheet[1]}/preview?gid=${gid}`
      : `https://docs.google.com/spreadsheets/d/${sheet[1]}/preview`;
  }

  return url;
}

export function lessonHasTeachingContent(lesson: {
  goal?: string | null;
  practicePrompt?: string | null;
  bodyMd?: string | null;
  videoUrl?: string | null;
  embedUrl?: string | null;
}) {
  return Boolean(
    lesson.goal?.trim() ||
      lesson.practicePrompt?.trim() ||
      lesson.bodyMd?.trim() ||
      lesson.videoUrl?.trim() ||
      lesson.embedUrl?.trim(),
  );
}
