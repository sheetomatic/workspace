"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/require-session";
import { generateSocialCopy, type SocialStudioBrief } from "@/lib/social/generate";
import {
  generateSocialCarouselImages,
  generateSocialImage,
} from "@/lib/social/images";
import {
  addSocialStudioPost,
  improveSocialPostWithAiAndSave,
  reloadSocialScheduleFromSeed,
  updateSocialPostStatus,
} from "@/lib/my-space/social/schedule";
import type { SocialPostFormat } from "@/lib/my-space/social/types";

async function requireSocialAccess() {
  return requireSession("STAFF", { module: "SOCIAL" });
}

function revalidateSocial() {
  revalidatePath("/app/social");
  revalidatePath("/app/my-space/social");
  revalidatePath("/app/my-space");
}

export type SocialActionState = { ok: boolean; message: string };

export async function socialScheduleAction(formData: FormData) {
  const user = await requireSocialAccess();
  const postId = String(formData.get("postId") || "");
  const action = String(formData.get("action") || "") as
    | "approve"
    | "improve"
    | "posted"
    | "reset";
  const feedback = String(formData.get("feedback") || "");

  if (!postId || !["approve", "improve", "posted", "reset"].includes(action)) {
    throw new Error("Invalid action");
  }

  if (action === "improve") {
    try {
      await improveSocialPostWithAiAndSave({
        organizationId: user.organizationId,
        postId,
        feedback,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI improve failed";
      if (msg === "OPENAI_NOT_CONFIGURED") {
        throw new Error("OpenAI is not configured on this environment");
      }
      if (msg.startsWith("OPENAI_ERROR:")) {
        throw new Error(msg.replace("OPENAI_ERROR:", ""));
      }
      if (msg === "OPENAI_EMPTY") {
        throw new Error("AI returned an empty rewrite — try again");
      }
      throw e instanceof Error ? e : new Error(msg);
    }
    revalidateSocial();
    return;
  }

  await updateSocialPostStatus({
    organizationId: user.organizationId,
    postId,
    action,
    feedback,
    actorName: user.name ?? user.email,
  });
  revalidateSocial();
}

export async function reloadSocialWeekAction() {
  const user = await requireSocialAccess();
  await reloadSocialScheduleFromSeed(user.organizationId);
  revalidateSocial();
}

export async function generateSocialCopyAction(brief: SocialStudioBrief) {
  await requireSocialAccess();
  try {
    const copy = await generateSocialCopy(brief);
    return { ok: true as const, copy };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not write the story.";
    return { ok: false as const, message };
  }
}

export async function generateSocialVisualsAction(artDirections: string[]) {
  await requireSocialAccess();
  const directions = artDirections.map((row) => row.trim()).filter(Boolean);
  if (directions.length === 0) {
    return { ok: false as const, message: "Write the story first so we know what to draw." };
  }
  try {
    const images =
      directions.length === 1
        ? [await generateSocialImage(directions[0])]
        : await generateSocialCarouselImages(directions);
    return { ok: true as const, images };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Could not generate images.";
    const message = raw.startsWith("OPENAI_ERROR:")
      ? raw.replace("OPENAI_ERROR:", "")
      : raw === "OPENAI_NOT_CONFIGURED"
        ? "OpenAI is not configured."
        : raw;
    return { ok: false as const, message };
  }
}

export async function saveSocialStudioPostAction(input: {
  title: string;
  caption: string;
  format: SocialPostFormat;
  pillar: string;
  icp: string;
  storyHook: string;
  artDirection: string;
  creative: string;
  carousel: string[];
  date?: string;
  time?: string;
}) {
  const user = await requireSocialAccess();
  const title = input.title.trim();
  const caption = input.caption.trim();
  if (title.length < 3 || caption.length < 40) {
    return { ok: false as const, message: "Generate or paste a full caption before saving." };
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const day = new Date(`${input.date || today}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    weekday: "short",
    timeZone: "Asia/Kolkata",
  });

  const post = await addSocialStudioPost({
    organizationId: user.organizationId,
    createdByName: user.name ?? user.email,
    post: {
      date: input.date || today,
      day,
      time: input.time || "11:00",
      title,
      pillar: input.pillar || "Studio",
      format: input.format,
      caption,
      creative: input.creative,
      carousel: input.format === "carousel" ? input.carousel : [],
      storyHook: input.storyHook,
      icp: input.icp,
      artDirection: input.artDirection,
      createdByName: user.name ?? user.email,
    },
  });
  revalidateSocial();
  return { ok: true as const, postId: post.id, message: "Saved to this week. Approve, then mark Posted after you publish." };
}
