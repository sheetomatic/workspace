export const SALES_RECORDING_RE = /requirement\s+understanding/i;
export const SKIP_RECORDING_RE =
  /notes by gemini|chat transcript|– notes|– transcript/i;

export type SessionBotLesson = {
  id: string;
  slug: string;
  title: string;
  moduleLabel: string;
  summary: string;
  sortOrder: number;
  practicePrompt?: string;
};

export type SessionBotRecording = {
  id: string;
  title: string;
  url: string;
  dateIst?: string | null;
  meetCode?: string | null;
};

export type SessionBotPick = {
  lessonId: string | null;
  recordingId: string | null;
  recordingTitle: string | null;
  attachToGroup: boolean;
  recap: string;
  reason: string;
};

export function istDateKey(value: Date) {
  return value.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function meetCodeFromText(value: string | null | undefined) {
  const match = String(value ?? "").match(
    /\b([a-z]{3}-[a-z]{4}-[a-z]{3})\b/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

export function parseIstDateFromTitle(title: string) {
  const match = title.match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function isUsableClassRecording(title: string) {
  if (SALES_RECORDING_RE.test(title)) return false;
  if (SKIP_RECORDING_RE.test(title)) return false;
  return true;
}

export function driveFileViewUrl(id: string) {
  return `https://drive.google.com/file/d/${id}/view?usp=sharing`;
}

export function dayDiff(a: string, b: string) {
  const left = Date.parse(`${a}T00:00:00+05:30`);
  const right = Date.parse(`${b}T00:00:00+05:30`);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 99;
  return Math.round(Math.abs(left - right) / 86_400_000);
}

export function scoreRecordingCandidate(params: {
  sessionDateIst: string;
  meetCode: string | null;
  studentName: string;
  candidate: SessionBotRecording;
}) {
  if (!isUsableClassRecording(params.candidate.title)) return -1000;
  let score = 0;
  const candidateDate =
    params.candidate.dateIst || parseIstDateFromTitle(params.candidate.title);
  if (candidateDate) {
    const diff = dayDiff(params.sessionDateIst, candidateDate);
    if (diff === 0) score += 12;
    else if (diff === 1) score += 7;
    else if (diff <= 3) score += 2;
    else score -= 4;
  }
  const candidateMeet =
    params.candidate.meetCode || meetCodeFromText(params.candidate.title);
  if (params.meetCode && candidateMeet && params.meetCode === candidateMeet) {
    score += 8;
  }
  const first = params.studentName.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (first && params.candidate.title.toLowerCase().includes(first)) {
    score += 3;
  }
  return score;
}

export function pickLessonForSession(
  sessionNumber: number,
  lessons: SessionBotLesson[],
) {
  const exact = lessons.find((lesson) => lesson.sortOrder === sessionNumber);
  if (exact) return exact;
  return lessons[sessionNumber - 1] ?? lessons[0] ?? null;
}

export function pickBestRecording(params: {
  sessionDateIst: string;
  meetCode: string | null;
  studentName: string;
  candidates: SessionBotRecording[];
}) {
  let best: SessionBotRecording | null = null;
  let bestScore = 3;
  for (const candidate of params.candidates) {
    const score = scoreRecordingCandidate({
      sessionDateIst: params.sessionDateIst,
      meetCode: params.meetCode,
      studentName: params.studentName,
      candidate,
    });
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

export function fallbackSessionBotPick(params: {
  sessionNumber: number;
  sessionDateIst: string;
  meetCode: string | null;
  studentName: string;
  hasGroup: boolean;
  lessons: SessionBotLesson[];
  recordings: SessionBotRecording[];
}): SessionBotPick {
  const lesson = pickLessonForSession(params.sessionNumber, params.lessons);
  const recording = pickBestRecording({
    sessionDateIst: params.sessionDateIst,
    meetCode: params.meetCode,
    studentName: params.studentName,
    candidates: params.recordings,
  });
  return {
    lessonId: lesson?.id ?? null,
    recordingId: recording?.id ?? null,
    recordingTitle: recording
      ? `Class recording — session ${params.sessionNumber}`
      : null,
    attachToGroup: params.hasGroup,
    recap: lesson
      ? `Session ${params.sessionNumber}: ${lesson.title}. ${lesson.summary}`.trim()
      : `Session ${params.sessionNumber} class files updated.`,
    reason: recording
      ? `Matched ${recording.title} to session ${params.sessionNumber}.`
      : `No new recording matched session ${params.sessionNumber}. Lesson still updated.`,
  };
}

export function parseSessionBotPick(
  raw: unknown,
  fallback: SessionBotPick,
): SessionBotPick {
  if (!raw || typeof raw !== "object") return fallback;
  const row = raw as Record<string, unknown>;
  const lessonId =
    typeof row.lessonId === "string" && row.lessonId.trim()
      ? row.lessonId.trim()
      : fallback.lessonId;
  const recordingId =
    typeof row.recordingId === "string" && row.recordingId.trim()
      ? row.recordingId.trim()
      : fallback.recordingId;
  return {
    lessonId,
    recordingId,
    recordingTitle:
      typeof row.recordingTitle === "string" && row.recordingTitle.trim()
        ? row.recordingTitle.trim().slice(0, 120)
        : fallback.recordingTitle,
    attachToGroup:
      typeof row.attachToGroup === "boolean"
        ? row.attachToGroup
        : fallback.attachToGroup,
    recap:
      typeof row.recap === "string" && row.recap.trim()
        ? row.recap.trim().slice(0, 400)
        : fallback.recap,
    reason:
      typeof row.reason === "string" && row.reason.trim()
        ? row.reason.trim().slice(0, 240)
        : fallback.reason,
  };
}
