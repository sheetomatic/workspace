import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { getGoogleSheetsCredentials } from "@/lib/integrations/google-sheets-auth";
import { requestOpenAiJson } from "@/lib/integrations/openai";
import { parseClassroomBoard } from "@/lib/learn/classroom-board";
import { listGroupSessionSlots } from "@/lib/learn/group-classroom-slots";
import { groupClassIdentity } from "@/lib/learn/group-classroom";
import { learnPortalOrigin } from "@/lib/workspace-auth-links";
import { normalizeTrainingContentUrl } from "@/lib/courses/session-materials";
import {
  driveFileViewUrl,
  fallbackSessionBotPick,
  isUsableClassRecording,
  istDateKey,
  meetCodeFromText,
  parseIstDateFromTitle,
  parseSessionBotPick,
  pickLessonForSession,
  type SessionBotLesson,
  type SessionBotPick,
  type SessionBotRecording,
} from "@/lib/learn/session-bot-match";

const DEFAULT_RECORDINGS_FOLDER = "1yI-6B3g5rTs7LCpqOSsm0o0E9HJeEQ9Q";

function boardSnippet(raw: unknown) {
  const board = parseClassroomBoard(raw);
  const cells = Object.entries(board.sheet.cells)
    .filter(([, value]) => String(value ?? "").trim())
    .slice(0, 24)
    .map(([key, value]) => `${key}: ${String(value).slice(0, 80)}`);
  return cells.join(" | ").slice(0, 600);
}

async function listDriveRecordings(): Promise<SessionBotRecording[]> {
  const folderId =
    process.env.LEARN_RECORDINGS_FOLDER_ID?.trim() || DEFAULT_RECORDINGS_FOLDER;
  const credentials = getGoogleSheetsCredentials();
  if (!credentials) return [];

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    const drive = google.drive({ version: "v3", auth });
    const listed = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id,name,mimeType)",
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const out: SessionBotRecording[] = [];
    for (const file of listed.data.files ?? []) {
      const id = file.id?.trim();
      const title = file.name?.trim() ?? "";
      const mime = file.mimeType ?? "";
      if (!id || !title || !isUsableClassRecording(title)) continue;
      const isVideo =
        mime.startsWith("video/") ||
        mime === "application/vnd.google-apps.video" ||
        /\(\d{4}-\d{2}-\d{2}/.test(title);
      if (!isVideo) continue;
      out.push({
        id,
        title,
        url: driveFileViewUrl(id),
        dateIst: parseIstDateFromTitle(title),
        meetCode: meetCodeFromText(title),
      });
    }
    return out;
  } catch (error) {
    console.warn("[learn-bot] Drive folder unread", error);
    return [];
  }
}

async function listDbRecordings(): Promise<SessionBotRecording[]> {
  const rows = await prisma.trainingSessionMaterial.findMany({
    where: {
      kind: "RECORDING",
      url: { not: null },
      createdAt: { gte: new Date(Date.now() - 120 * 86_400_000) },
    },
    select: { id: true, title: true, url: true },
    take: 80,
  });
  return rows.flatMap((row) => {
    const url = normalizeTrainingContentUrl(row.url);
    if (!url || !isUsableClassRecording(row.title)) return [];
    const driveId = url.match(/\/file\/d\/([^/]+)/)?.[1] ?? row.id;
    return [
      {
        id: driveId,
        title: row.title,
        url,
        dateIst: parseIstDateFromTitle(row.title),
        meetCode: meetCodeFromText(row.title),
      },
    ];
  });
}

async function pickWithAi(params: {
  sessionNumber: number;
  whenLabel: string;
  studentName: string;
  groupLabel: string | null;
  board: string;
  notes: string;
  lessons: SessionBotLesson[];
  recordings: SessionBotRecording[];
  fallback: SessionBotPick;
}): Promise<SessionBotPick> {
  try {
    const { content } = await requestOpenAiJson(
      `You update a student's Learn panel after a live Sheets class.

Pick ONE lesson (by id) for this session number, and ONE recording (by id) when a class video matches. Skip sales "Requirement Understanding" files and Gemini notes.

Return JSON:
- lessonId: string or ""
- recordingId: string or ""
- recordingTitle: short Class files label
- attachToGroup: true when this was a combined/group class
- recap: one or two sentences for the trainer
- reason: one sentence of what you picked

Prefer the lesson whose sortOrder equals the session number. Prefer a recording on the same IST date in the student's Meet room.`,
      JSON.stringify({
        sessionNumber: params.sessionNumber,
        when: params.whenLabel,
        student: params.studentName,
        group: params.groupLabel,
        notes: params.notes,
        board: params.board,
        lessons: params.lessons.map((lesson) => ({
          id: lesson.id,
          no: lesson.sortOrder,
          title: lesson.title,
          summary: lesson.summary,
        })),
        recordings: params.recordings.map((row) => ({
          id: row.id,
          title: row.title,
          date: row.dateIst,
          meet: row.meetCode,
        })),
      }),
      { temperature: 0.1, maxTokens: 600 },
    );
    return parseSessionBotPick(JSON.parse(content), params.fallback);
  } catch (error) {
    console.warn("[learn-bot] OpenAI", error);
    return params.fallback;
  }
}

export async function runLearnSessionBot(params: {
  slotId: string;
  userId: string;
}) {
  const slot = await prisma.trainingCourseSlot.findFirst({
    where: { id: params.slotId },
    include: {
      enrollment: {
        select: {
          id: true,
          name: true,
          meetUrl: true,
          groupMeetUrl: true,
          groupKey: true,
          groupLabel: true,
          inboundLeadId: true,
        },
      },
      materials: {
        select: { kind: true, url: true, title: true },
      },
    },
  });
  if (!slot) {
    return { ok: false as const, message: "Session not found." };
  }

  const course = await prisma.trainingCourse.findFirst({
    where: { track: "SHEETS" },
    include: {
      lessons: {
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          moduleLabel: true,
          summary: true,
          sortOrder: true,
          practicePrompt: true,
        },
      },
    },
  });
  const lessons = course?.lessons ?? [];

  const [driveRows, dbRows] = await Promise.all([
    listDriveRecordings(),
    listDbRecordings(),
  ]);
  const recordings = new Map<string, SessionBotRecording>();
  for (const row of [...driveRows, ...dbRows]) {
    if (!recordings.has(row.id)) recordings.set(row.id, row);
  }
  const candidates = [...recordings.values()];

  const sessionDateIst = istDateKey(slot.startsAt);
  const meetCode = meetCodeFromText(
    slot.meetUrl || slot.enrollment.groupMeetUrl || slot.enrollment.meetUrl,
  );
  const hasGroup = Boolean(groupClassIdentity(slot.enrollment));
  const fallback = fallbackSessionBotPick({
    sessionNumber: slot.sessionNumber,
    sessionDateIst,
    meetCode,
    studentName: slot.enrollment.name,
    hasGroup,
    lessons,
    recordings: candidates,
  });

  const pick = await pickWithAi({
    sessionNumber: slot.sessionNumber,
    whenLabel: slot.startsAt.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    }),
    studentName: slot.enrollment.name,
    groupLabel: slot.enrollment.groupLabel,
    board: boardSnippet(slot.classroomBoard),
    notes: slot.notes ?? "",
    lessons,
    recordings: candidates,
    fallback,
  });

  const lesson =
    lessons.find((row) => row.id === pick.lessonId) ??
    lessons.find((row) => row.sortOrder === slot.sessionNumber) ??
    null;
  const recording =
    candidates.find((row) => row.id === pick.recordingId) ?? null;
  const recordingUrl = recording
    ? normalizeTrainingContentUrl(recording.url)
    : null;

  const targets = pick.attachToGroup
    ? await listGroupSessionSlots(slot)
    : [slot];
  const targetIds = [...new Set([slot.id, ...targets.map((row) => row.id)])];

  const existing = await prisma.trainingSessionMaterial.findMany({
    where: { slotId: { in: targetIds } },
    select: { slotId: true, kind: true, url: true },
  });
  const hasUrl = (slotId: string, url: string) =>
    existing.some((row) => row.slotId === slotId && row.url === url);

  let recordingsAdded = 0;
  let lessonsLinked = 0;

  await prisma.$transaction(async (tx) => {
    if (recordingUrl) {
      const title =
        pick.recordingTitle ||
        `Class recording — session ${slot.sessionNumber}`;
      for (const targetId of targetIds) {
        if (hasUrl(targetId, recordingUrl)) continue;
        await tx.trainingSessionMaterial.create({
          data: {
            slotId: targetId,
            kind: "RECORDING",
            title,
            url: recordingUrl,
            createdById: params.userId,
          },
        });
        recordingsAdded += 1;
      }
    }

    const applySlots = targets.length > 0 ? targets : [slot];
    if (lesson) {
      for (const target of applySlots) {
        const targetLesson =
          pickLessonForSession(target.sessionNumber, lessons) ?? lesson;
        const lessonUrl = `${learnPortalOrigin()}/learn/courses/sheets/${targetLesson.slug}`;
        if (!hasUrl(target.id, lessonUrl)) {
          await tx.trainingSessionMaterial.create({
            data: {
              slotId: target.id,
              kind: "DOCUMENT",
              title: `Lesson · ${targetLesson.title}`,
              url: lessonUrl,
              createdById: params.userId,
            },
          });
        }
        await tx.trainingLessonProgress.upsert({
          where: {
            enrollmentId_lessonId: {
              enrollmentId: target.enrollmentId,
              lessonId: targetLesson.id,
            },
          },
          create: {
            enrollmentId: target.enrollmentId,
            lessonId: targetLesson.id,
            completedAt: new Date(),
          },
          update: { completedAt: new Date() },
        });
        await tx.trainingCourseSlot.update({
          where: { id: target.id },
          data: {
            title: `Session ${target.sessionNumber} · ${targetLesson.title}`,
            notes: pick.recap,
            status: "COMPLETED",
          },
        });
        lessonsLinked += 1;
      }
    } else if (recordingUrl) {
      await tx.trainingCourseSlot.updateMany({
        where: { id: { in: targetIds } },
        data: { status: "COMPLETED", notes: pick.recap },
      });
    }
  });

  const who =
    targetIds.length > 1
      ? `${targetIds.length} students in the combined class`
      : slot.enrollment.name;
  const bits = [
    recordingsAdded
      ? `${recordingsAdded} recording${recordingsAdded === 1 ? "" : "s"}`
      : null,
    lesson ? `lesson “${lesson.title}”` : null,
  ].filter(Boolean);
  if (bits.length === 0) {
    return {
      ok: true as const,
      message: `${pick.reason} Nothing new to write on Learn for ${who}.`,
    };
  }
  return {
    ok: true as const,
    message: `Learn updated for ${who}: ${bits.join(" + ")}. ${pick.reason}`,
  };
}
