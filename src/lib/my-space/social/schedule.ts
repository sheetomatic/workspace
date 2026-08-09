import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { improveSocialPostWithAi } from "@/lib/my-space/social/improve";
import type {
  SocialPost,
  SocialPostStatus,
  SocialSchedule,
} from "@/lib/my-space/social/types";

const SEED_PATH = path.join(
  process.cwd(),
  "data/my-space/social-schedule.json",
);

function normalizePost(raw: Record<string, unknown>): SocialPost | null {
  if (typeof raw.id !== "string" || typeof raw.caption !== "string") return null;
  const carousel = Array.isArray(raw.carousel)
    ? raw.carousel.filter((x): x is string => typeof x === "string")
    : [];
  const format = raw.format === "carousel" || carousel.length > 0 ? "carousel" : "image";
  return {
    id: raw.id,
    date: String(raw.date || ""),
    day: String(raw.day || ""),
    time: String(raw.time || ""),
    title: String(raw.title || "Untitled"),
    pillar: String(raw.pillar || ""),
    format,
    status: (raw.status as SocialPostStatus) || "pending_approval",
    caption: raw.caption,
    creative: String(raw.creative || ""),
    carousel,
    feedback: String(raw.feedback || ""),
    postedAt: typeof raw.postedAt === "string" ? raw.postedAt : null,
    storyHook: typeof raw.storyHook === "string" ? raw.storyHook : undefined,
  };
}

function isSchedule(value: unknown): value is SocialSchedule {
  if (!value || typeof value !== "object") return false;
  const v = value as SocialSchedule;
  return Array.isArray(v.posts) && typeof v.weekId === "string";
}

function normalizeSchedule(value: unknown): SocialSchedule | null {
  if (!isSchedule(value)) return null;
  const posts = value.posts
    .map((p) => normalizePost(p as unknown as Record<string, unknown>))
    .filter((p): p is SocialPost => Boolean(p));
  return {
    weekId: value.weekId,
    weekLabel: value.weekLabel || value.weekId,
    timezone: value.timezone || "Asia/Kolkata",
    platform: value.platform || "linkedin",
    account: value.account || "sheetomatic",
    character: value.character || "",
    premise: value.premise || "",
    slotsPerDay: value.slotsPerDay?.length
      ? value.slotsPerDay
      : ["08:00", "11:00", "16:00", "21:00"],
    updatedAt: value.updatedAt || new Date().toISOString(),
    posts,
  };
}

export async function loadSeedSchedule(): Promise<SocialSchedule> {
  const raw = await readFile(SEED_PATH, "utf8");
  const parsed = normalizeSchedule(JSON.parse(raw));
  if (!parsed) throw new Error("Invalid social schedule seed file");
  return parsed;
}

async function saveSchedule(organizationId: string, schedule: SocialSchedule) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { socialSchedule: schedule as unknown as Prisma.InputJsonValue },
  });
}

export async function getSocialSchedule(
  organizationId: string,
): Promise<SocialSchedule> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { socialSchedule: true },
  });

  const existing = normalizeSchedule(org?.socialSchedule);
  const seed = await loadSeedSchedule();

  // Auto-upgrade when seed pack changes (new weekId)
  if (!existing || existing.weekId !== seed.weekId) {
    await saveSchedule(organizationId, seed);
    return seed;
  }

  return existing;
}

export async function reloadSocialScheduleFromSeed(
  organizationId: string,
): Promise<SocialSchedule> {
  const seed = await loadSeedSchedule();
  await saveSchedule(organizationId, seed);
  return seed;
}

export async function updateSocialPostStatus(params: {
  organizationId: string;
  postId: string;
  action: "approve" | "improve" | "posted" | "reset";
  feedback?: string;
}): Promise<SocialPost> {
  const schedule = await getSocialSchedule(params.organizationId);
  const post = schedule.posts.find((p) => p.id === params.postId);
  if (!post) throw new Error("Post not found");

  let status: SocialPostStatus = post.status;
  let feedback = post.feedback;
  let postedAt = post.postedAt;

  if (params.action === "approve") {
    status = "approved";
    feedback = "";
  } else if (params.action === "improve") {
    const note = (params.feedback || "").trim();
    if (!note) throw new Error("Feedback required");
    status = "needs_improvement";
    feedback = note;
  } else if (params.action === "posted") {
    status = "posted";
    postedAt = new Date().toISOString();
  } else if (params.action === "reset") {
    status = "pending_approval";
    feedback = "";
    postedAt = null;
  }

  const next: SocialSchedule = {
    ...schedule,
    updatedAt: new Date().toISOString(),
    posts: schedule.posts.map((p) =>
      p.id === params.postId ? { ...p, status, feedback, postedAt } : p,
    ),
  };

  await saveSchedule(params.organizationId, next);
  const updated = next.posts.find((p) => p.id === params.postId);
  if (!updated) throw new Error("Post missing after update");
  return updated;
}

export async function improveSocialPostWithAiAndSave(params: {
  organizationId: string;
  postId: string;
  feedback: string;
}): Promise<SocialPost> {
  const schedule = await getSocialSchedule(params.organizationId);
  const post = schedule.posts.find((p) => p.id === params.postId);
  if (!post) throw new Error("Post not found");
  if (post.status === "posted") {
    throw new Error("Posted items cannot be improved");
  }
  if (post.format === "carousel" && !post.caption.trim()) {
    throw new Error(
      "Weekend carousels are visual-only (no caption). Ask for a creative note in chat with Sam, or switch to a weekday story post.",
    );
  }

  const improved = await improveSocialPostWithAi({
    post,
    feedback: params.feedback,
  });

  const feedbackParts = [
    `AI applied: ${params.feedback.trim()}`,
    improved.creativeNotes ? `Creative note: ${improved.creativeNotes}` : "",
  ].filter(Boolean);

  const next: SocialSchedule = {
    ...schedule,
    updatedAt: new Date().toISOString(),
    posts: schedule.posts.map((p) =>
      p.id === params.postId
        ? {
            ...p,
            title: improved.title,
            caption: improved.caption,
            status: "pending_approval" as SocialPostStatus,
            feedback: feedbackParts.join("\n"),
            postedAt: null,
          }
        : p,
    ),
  };

  await saveSchedule(params.organizationId, next);
  const updated = next.posts.find((p) => p.id === params.postId);
  if (!updated) throw new Error("Post missing after AI improve");
  return updated;
}
