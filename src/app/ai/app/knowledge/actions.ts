"use server";

import { revalidatePath } from "next/cache";
import type { AiKnowledgeType } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import type { AiKnowledgeActionState } from "@/lib/ai-knowledge-types";
import { fetchWebsiteTextContent } from "@/lib/integrations/website-sync";
import { syncYoutubeChannelContent } from "@/lib/integrations/youtube-channel-sync";
import { extractDocumentText, resolveDocumentTitle } from "@/lib/integrations/document-extract";
import {
  AI_KNOWLEDGE_MAX_CONTENT_CHARS,
  AI_KNOWLEDGE_MIN_DOCUMENT_CHARS,
  AI_KNOWLEDGE_MIN_FAQ_ANSWER_CHARS,
  AI_KNOWLEDGE_MIN_FAQ_QUESTION_CHARS,
  validateKnowledgeTextContent,
  validateKnowledgeUploadFile,
} from "@/lib/ai-knowledge-limits";
import {
  autoGenerateFaqsFromContent,
  faqSuccessSuffix,
  generateFaqsForKnowledgeItem,
  shouldGenerateFaqs,
} from "@/lib/ai-knowledge-faq-generate";

const KNOWLEDGE_PATH = "/ai/app/knowledge";

function revalidateKnowledge() {
  revalidatePath(KNOWLEDGE_PATH);
  revalidatePath("/ai/app/inbox");
}

function parseType(value: string): AiKnowledgeType | null {
  if (
    value === "FAQ" ||
    value === "DOCUMENT" ||
    value === "WEBSITE" ||
    value === "YOUTUBE_CHANNEL"
  ) {
    return value;
  }
  return null;
}

function actionError(error: unknown, fallback: string): AiKnowledgeActionState {
  console.error("[knowledge]", error);
  if (error instanceof Error) {
    if (error.message.includes("AiKnowledgeItem")) {
      return {
        ok: false,
        message: "Training data table is not ready. Contact support or retry in a minute.",
      };
    }
    return { ok: false, message: error.message || fallback };
  }
  return { ok: false, message: fallback };
}

export async function createFaqKnowledgeItem(
  _prev: AiKnowledgeActionState,
  formData: FormData,
): Promise<AiKnowledgeActionState> {
  try {
    const user = await getSessionUser();
    if (!user || !hasMinimumRole(user.role, "ADMIN")) {
      return { ok: false, message: "You cannot edit AI training data." };
    }

    const question = formData.get("question")?.toString().trim() ?? "";
    const answer = formData.get("answer")?.toString().trim() ?? "";

    if (question.length < AI_KNOWLEDGE_MIN_FAQ_QUESTION_CHARS) {
      return {
        ok: false,
        message: `Question must be at least ${AI_KNOWLEDGE_MIN_FAQ_QUESTION_CHARS} characters.`,
      };
    }
    if (answer.length < AI_KNOWLEDGE_MIN_FAQ_ANSWER_CHARS) {
      return {
        ok: false,
        message: `Answer must be at least ${AI_KNOWLEDGE_MIN_FAQ_ANSWER_CHARS} characters.`,
      };
    }

    const answerCheck = validateKnowledgeTextContent(answer, AI_KNOWLEDGE_MIN_FAQ_ANSWER_CHARS);
    if (!answerCheck.ok) {
      return { ok: false, message: answerCheck.message };
    }

    await prisma.aiKnowledgeItem.create({
      data: {
        organizationId: user.organizationId,
        type: "FAQ",
        title: question.slice(0, 120),
        question,
        content: answerCheck.text,
        createdById: user.id,
      },
    });

    revalidateKnowledge();
    return { ok: true, message: "FAQ added to AI training data." };
  } catch (error) {
    return actionError(error, "Could not save FAQ. Please try again.");
  }
}

export async function createDocumentKnowledgeItem(
  _prev: AiKnowledgeActionState,
  formData: FormData,
): Promise<AiKnowledgeActionState> {
  try {
    const user = await getSessionUser();
    if (!user || !hasMinimumRole(user.role, "ADMIN")) {
      return { ok: false, message: "You cannot edit AI training data." };
    }

    const titleInput = formData.get("title")?.toString().trim() ?? "";
    let content = formData.get("content")?.toString().trim() ?? "";
    const file = formData.get("file");
    let fileName: string | undefined;

    if (file instanceof File && file.size > 0) {
      const fileCheck = validateKnowledgeUploadFile(file);
      if (!fileCheck.ok) {
        return { ok: false, message: fileCheck.message };
      }
      fileName = file.name;
      const extracted = await extractDocumentText(file);
      if (!extracted.ok) {
        return { ok: false, message: extracted.message };
      }
      content = extracted.text;
    }

    if (!fileName && content) {
      const pasted = validateKnowledgeTextContent(content);
      if (!pasted.ok) {
        return { ok: false, message: pasted.message };
      }
      content = pasted.text;
    }

    const title = resolveDocumentTitle({ titleInput, content, fileName });

    if (title.length < 3) {
      return {
        ok: false,
        message: "Add a title, upload a named file, or paste at least one line of content.",
      };
    }
    if (content.length < AI_KNOWLEDGE_MIN_DOCUMENT_CHARS) {
      return {
        ok: false,
        message: "Add document content or upload a PDF, DOCX, or text file.",
      };
    }

    await prisma.aiKnowledgeItem.create({
      data: {
        organizationId: user.organizationId,
        type: "DOCUMENT",
        title,
        content: content.slice(0, AI_KNOWLEDGE_MAX_CONTENT_CHARS),
        createdById: user.id,
      },
    });

    const faqResult = await autoGenerateFaqsFromContent({
      organizationId: user.organizationId,
      createdById: user.id,
      content,
      sourceTitle: title,
      enabled: shouldGenerateFaqs(formData),
    });

    revalidateKnowledge();
    return {
      ok: true,
      message: `Document added to AI training data.${faqSuccessSuffix(
        faqResult.created,
        faqResult.skipped ? faqResult.message : undefined,
      )}`,
    };
  } catch (error) {
    return actionError(error, "Could not save document. Please try again.");
  }
}

export async function createWebsiteKnowledgeItem(
  _prev: AiKnowledgeActionState,
  formData: FormData,
): Promise<AiKnowledgeActionState> {
  try {
    const user = await getSessionUser();
    if (!user || !hasMinimumRole(user.role, "ADMIN")) {
      return { ok: false, message: "You cannot edit AI training data." };
    }

    const sourceUrl = formData.get("sourceUrl")?.toString().trim() ?? "";
    const fetched = await fetchWebsiteTextContent(sourceUrl);
    if (!fetched.ok) {
      return { ok: false, message: fetched.message };
    }

    const existing = await prisma.aiKnowledgeItem.findFirst({
      where: {
        organizationId: user.organizationId,
        type: "WEBSITE",
        sourceUrl: fetched.url,
        status: "ACTIVE",
      },
    });

    if (existing) {
      await prisma.aiKnowledgeItem.update({
        where: { id: existing.id },
        data: {
          title: fetched.title.slice(0, 120),
          content: fetched.content,
          lastSyncedAt: new Date(),
        },
      });

      const faqResult = await autoGenerateFaqsFromContent({
        organizationId: user.organizationId,
        createdById: user.id,
        content: fetched.content,
        sourceTitle: fetched.title,
        enabled: shouldGenerateFaqs(formData),
      });

      revalidateKnowledge();
      return {
        ok: true,
        message: `Website content refreshed in AI training data.${faqSuccessSuffix(
          faqResult.created,
          faqResult.skipped ? faqResult.message : undefined,
        )}`,
      };
    }

    await prisma.aiKnowledgeItem.create({
      data: {
        organizationId: user.organizationId,
        type: "WEBSITE",
        title: fetched.title.slice(0, 120),
        content: fetched.content,
        sourceUrl: fetched.url,
        lastSyncedAt: new Date(),
        createdById: user.id,
      },
    });

    const faqResult = await autoGenerateFaqsFromContent({
      organizationId: user.organizationId,
      createdById: user.id,
      content: fetched.content,
      sourceTitle: fetched.title,
      enabled: shouldGenerateFaqs(formData),
    });

    revalidateKnowledge();
    return {
      ok: true,
      message: `Website synced to AI training data.${faqSuccessSuffix(
        faqResult.created,
        faqResult.skipped ? faqResult.message : undefined,
      )}`,
    };
  } catch (error) {
    return actionError(error, "Could not sync website. Please try again.");
  }
}

export async function createYoutubeChannelKnowledgeItem(
  _prev: AiKnowledgeActionState,
  formData: FormData,
): Promise<AiKnowledgeActionState> {
  try {
    const user = await getSessionUser();
    if (!user || !hasMinimumRole(user.role, "ADMIN")) {
      return { ok: false, message: "You cannot edit AI training data." };
    }

    const sourceUrl = formData.get("sourceUrl")?.toString().trim() ?? "";
    const synced = await syncYoutubeChannelContent(sourceUrl);
    if (!synced.ok) {
      return { ok: false, message: synced.message };
    }

    const existing = await prisma.aiKnowledgeItem.findFirst({
      where: {
        organizationId: user.organizationId,
        type: "YOUTUBE_CHANNEL",
        sourceUrl: synced.channelUrl,
        status: "ACTIVE",
      },
    });

    if (existing) {
      await prisma.aiKnowledgeItem.update({
        where: { id: existing.id },
        data: {
          title: synced.channelTitle.slice(0, 120),
          content: synced.content,
          lastSyncedAt: new Date(),
        },
      });

      const faqResult = await autoGenerateFaqsFromContent({
        organizationId: user.organizationId,
        createdById: user.id,
        content: synced.content,
        sourceTitle: synced.channelTitle,
        enabled: shouldGenerateFaqs(formData),
      });

      revalidateKnowledge();
      return {
        ok: true,
        message: `YouTube channel refreshed in AI training data.${faqSuccessSuffix(
          faqResult.created,
          faqResult.skipped ? faqResult.message : undefined,
        )}`,
      };
    }

    await prisma.aiKnowledgeItem.create({
      data: {
        organizationId: user.organizationId,
        type: "YOUTUBE_CHANNEL",
        title: synced.channelTitle.slice(0, 120),
        content: synced.content,
        sourceUrl: synced.channelUrl,
        lastSyncedAt: new Date(),
        createdById: user.id,
      },
    });

    const faqResult = await autoGenerateFaqsFromContent({
      organizationId: user.organizationId,
      createdById: user.id,
      content: synced.content,
      sourceTitle: synced.channelTitle,
      enabled: shouldGenerateFaqs(formData),
    });

    revalidateKnowledge();
    return {
      ok: true,
      message: `YouTube channel synced to AI training data.${faqSuccessSuffix(
        faqResult.created,
        faqResult.skipped ? faqResult.message : undefined,
      )}`,
    };
  } catch (error) {
    return actionError(error, "Could not sync YouTube channel. Please try again.");
  }
}

export async function syncYoutubeChannelKnowledgeItem(
  itemId: string,
): Promise<AiKnowledgeActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "You cannot edit AI training data." };
  }

  const item = await prisma.aiKnowledgeItem.findFirst({
    where: {
      id: itemId,
      organizationId: user.organizationId,
      type: "YOUTUBE_CHANNEL",
      status: "ACTIVE",
    },
  });

  if (!item?.sourceUrl) {
    return { ok: false, message: "YouTube channel source not found." };
  }

  const synced = await syncYoutubeChannelContent(item.sourceUrl);
  if (!synced.ok) {
    return { ok: false, message: synced.message };
  }

  await prisma.aiKnowledgeItem.update({
    where: { id: item.id },
    data: {
      title: synced.channelTitle.slice(0, 120),
      content: synced.content,
      sourceUrl: synced.channelUrl,
      lastSyncedAt: new Date(),
    },
  });

  const faqResult = await autoGenerateFaqsFromContent({
    organizationId: user.organizationId,
    createdById: user.id,
    content: synced.content,
    sourceTitle: synced.channelTitle,
    enabled: true,
  });

  revalidateKnowledge();
  return {
    ok: true,
    message: `YouTube channel synced.${faqSuccessSuffix(
      faqResult.created,
      faqResult.skipped ? faqResult.message : undefined,
    )}`,
  };
}

export async function syncWebsiteKnowledgeItem(
  itemId: string,
): Promise<AiKnowledgeActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "You cannot edit AI training data." };
  }

  const item = await prisma.aiKnowledgeItem.findFirst({
    where: {
      id: itemId,
      organizationId: user.organizationId,
      type: "WEBSITE",
      status: "ACTIVE",
    },
  });

  if (!item?.sourceUrl) {
    return { ok: false, message: "Website source not found." };
  }

  const fetched = await fetchWebsiteTextContent(item.sourceUrl);
  if (!fetched.ok) {
    return { ok: false, message: fetched.message };
  }

  await prisma.aiKnowledgeItem.update({
    where: { id: item.id },
    data: {
      title: fetched.title.slice(0, 120),
      content: fetched.content,
      sourceUrl: fetched.url,
      lastSyncedAt: new Date(),
    },
  });

  const faqResult = await autoGenerateFaqsFromContent({
    organizationId: user.organizationId,
    createdById: user.id,
    content: fetched.content,
    sourceTitle: fetched.title,
    enabled: true,
  });

  revalidateKnowledge();
  return {
    ok: true,
    message: `Website content synced.${faqSuccessSuffix(
      faqResult.created,
      faqResult.skipped ? faqResult.message : undefined,
    )}`,
  };
}

export async function generateFaqsFromKnowledgeItemAction(
  itemId: string,
): Promise<AiKnowledgeActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "You cannot edit AI training data." };
  }

  try {
    const result = await generateFaqsForKnowledgeItem({
      organizationId: user.organizationId,
      createdById: user.id,
      itemId,
    });

    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    revalidateKnowledge();
    return { ok: true, message: result.message };
  } catch (error) {
    return actionError(error, "Could not generate FAQs. Please try again.");
  }
}

export async function archiveKnowledgeItem(
  itemId: string,
): Promise<AiKnowledgeActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "You cannot edit AI training data." };
  }

  const item = await prisma.aiKnowledgeItem.findFirst({
    where: { id: itemId, organizationId: user.organizationId, status: "ACTIVE" },
  });

  if (!item) {
    return { ok: false, message: "Training item not found." };
  }

  await prisma.aiKnowledgeItem.update({
    where: { id: item.id },
    data: { status: "ARCHIVED" },
  });

  revalidateKnowledge();
  return { ok: true, message: "Removed from AI training data." };
}

export async function updateFaqKnowledgeItem(
  _prev: AiKnowledgeActionState,
  formData: FormData,
): Promise<AiKnowledgeActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "You cannot edit AI training data." };
  }

  const itemId = formData.get("itemId")?.toString() ?? "";
  const question = formData.get("question")?.toString().trim() ?? "";
  const answer = formData.get("answer")?.toString().trim() ?? "";

  if (!itemId) {
    return { ok: false, message: "Missing item." };
  }
  if (question.length < 5 || answer.length < 10) {
    return { ok: false, message: "Question and answer must be long enough." };
  }

  const updated = await prisma.aiKnowledgeItem.updateMany({
    where: {
      id: itemId,
      organizationId: user.organizationId,
      type: "FAQ",
      status: "ACTIVE",
    },
    data: {
      title: question.slice(0, 120),
      question,
      content: answer,
    },
  });

  if (updated.count === 0) {
    return { ok: false, message: "FAQ not found." };
  }

  revalidateKnowledge();
  return { ok: true, message: "FAQ updated." };
}

export async function updateDocumentKnowledgeItem(
  _prev: AiKnowledgeActionState,
  formData: FormData,
): Promise<AiKnowledgeActionState> {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, message: "You cannot edit AI training data." };
  }

  const itemId = formData.get("itemId")?.toString() ?? "";
  const title = formData.get("title")?.toString().trim() ?? "";
  const content = formData.get("content")?.toString().trim() ?? "";

  if (!itemId) {
    return { ok: false, message: "Missing item." };
  }
  if (title.length < 3 || content.length < AI_KNOWLEDGE_MIN_DOCUMENT_CHARS) {
    return { ok: false, message: "Title and content must be long enough." };
  }

  const contentCheck = validateKnowledgeTextContent(content, AI_KNOWLEDGE_MIN_DOCUMENT_CHARS);
  if (!contentCheck.ok) {
    return { ok: false, message: contentCheck.message };
  }

  const updated = await prisma.aiKnowledgeItem.updateMany({
    where: {
      id: itemId,
      organizationId: user.organizationId,
      type: "DOCUMENT",
      status: "ACTIVE",
    },
    data: {
      title: title.slice(0, 120),
      content: contentCheck.text,
    },
  });

  if (updated.count === 0) {
    return { ok: false, message: "Document not found." };
  }

  revalidateKnowledge();
  return { ok: true, message: "Document updated." };
}

export async function listKnowledgeItemsForSession(type?: string) {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "ADMIN")) {
    return [];
  }

  const parsed = type ? parseType(type) : null;

  return prisma.aiKnowledgeItem.findMany({
    where: {
      organizationId: user.organizationId,
      status: "ACTIVE",
      ...(parsed ? { type: parsed } : {}),
    },
    orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
    include: {
      createdBy: { select: { name: true, email: true } },
    },
  });
}
