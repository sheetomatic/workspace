import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { improveSocialPostWithAi } from "@/lib/my-space/social/improve";
import type { SocialPost, SocialPostStatus, SocialSchedule } from "@/lib/my-space/social/types";

const SEED_PATH = path.join(
  process.cwd(),
  "data/my-space/social-schedule.json",
);

function isSchedule(value: unknown): value is SocialSchedule {
  if (!value || typeof value !== "object") return false;
  const v = value as SocialSchedule;
  return Array.isArray(v.posts) && typeof v.weekId === "string";
}

export async function loadSeedSchedule(): Promise<SocialSchedule> {
  const raw = await readFile(SEED_PATH, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!isSchedule(parsed)) {
    throw new Error("Invalid social schedule seed file");
  }
  return parsed;
}

export async function getSocialSchedule(
  organizationId: string,
): Promise<SocialSchedule> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { socialSchedule: true },
  });

  if (isSchedule(org?.socialSchedule)) {
    return org.socialSchedule;
  }

  const seed = await loadSeedSchedule();
  await prisma.organization.update({
    where: { id: organizationId },
    data: { socialSchedule: seed as Prisma.InputJsonValue },
  });
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
  if (!post) {
    throw new Error("Post not found");
  }

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

  await prisma.organization.update({
    where: { id: params.organizationId },
    data: { socialSchedule: next as Prisma.InputJsonValue },
  });

  const updated = next.posts.find((p) => p.id === params.postId);
  if (!updated) throw new Error("Post missing after update");
  return updated;
}

async function saveSchedule(organizationId: string, schedule: SocialSchedule) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { socialSchedule: schedule as Prisma.InputJsonValue },
  });
}

/** Run AI rewrite from reviewer feedback, then set status back to pending approval. */
export async function improveSocialPostWithAiAndSave(params: {
  organizationId: string;
  postId: string;
  feedback: string;
}): Promise<SocialPost> {
  const schedule = await getSocialSchedule(params.organizationId);
  const post = schedule.posts.find((p) => p.id === params.postId);
  if (!post) {
    throw new Error("Post not found");
  }
  if (post.status === "posted") {
    throw new Error("Posted items cannot be improved");
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
