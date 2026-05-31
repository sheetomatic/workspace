import { prisma } from "@/lib/db";
import {
  generateFaqsFromTrainingContent,
  type GeneratedFaq,
} from "@/lib/integrations/generate-faqs-from-content";

function shouldGenerateFaqs(formData: FormData) {
  return formData.get("generateFaqs") === "on";
}

export async function persistGeneratedFaqs(params: {
  organizationId: string;
  createdById: string;
  faqs: GeneratedFaq[];
}) {
  if (params.faqs.length === 0) {
    return 0;
  }

  const existing = await prisma.aiKnowledgeItem.findMany({
    where: {
      organizationId: params.organizationId,
      type: "FAQ",
      status: "ACTIVE",
    },
    select: { question: true },
  });

  const existingQuestions = new Set(
    existing
      .map((item) => item.question?.trim().toLowerCase())
      .filter(Boolean) as string[],
  );

  let created = 0;
  for (const faq of params.faqs) {
    const key = faq.question.trim().toLowerCase();
    if (existingQuestions.has(key)) {
      continue;
    }

    await prisma.aiKnowledgeItem.create({
      data: {
        organizationId: params.organizationId,
        type: "FAQ",
        title: faq.question.slice(0, 120),
        question: faq.question,
        content: faq.answer,
        createdById: params.createdById,
      },
    });

    existingQuestions.add(key);
    created += 1;
  }

  return created;
}

export async function autoGenerateFaqsFromContent(params: {
  organizationId: string;
  createdById: string;
  content: string;
  sourceTitle: string;
  enabled: boolean;
}) {
  if (!params.enabled) {
    return { created: 0, skipped: false as const };
  }

  const generated = await generateFaqsFromTrainingContent({
    content: params.content,
    sourceTitle: params.sourceTitle,
  });

  if (!generated.ok) {
    return { created: 0, skipped: true as const, message: generated.message };
  }

  const created = await persistGeneratedFaqs({
    organizationId: params.organizationId,
    createdById: params.createdById,
    faqs: generated.faqs,
  });

  return { created, skipped: false as const };
}

export { shouldGenerateFaqs };

export async function generateFaqsForKnowledgeItem(params: {
  organizationId: string;
  createdById: string;
  itemId: string;
}) {
  const item = await prisma.aiKnowledgeItem.findFirst({
    where: {
      id: params.itemId,
      organizationId: params.organizationId,
      status: "ACTIVE",
      type: { in: ["DOCUMENT", "WEBSITE", "YOUTUBE_CHANNEL"] },
    },
  });

  if (!item) {
    return {
      ok: false as const,
      message: "Document, website, or YouTube channel article not found.",
    };
  }

  const generated = await generateFaqsFromTrainingContent({
    content: item.content,
    sourceTitle: item.title,
  });

  if (!generated.ok) {
    return { ok: false as const, message: generated.message };
  }

  const created = await persistGeneratedFaqs({
    organizationId: params.organizationId,
    createdById: params.createdById,
    faqs: generated.faqs,
  });

  if (created === 0) {
    return {
      ok: true as const,
      message: "FAQs already exist for these topics. No new FAQs were added.",
      created: 0,
    };
  }

  return {
    ok: true as const,
    message: `Generated ${created} FAQ${created === 1 ? "" : "s"} from "${item.title}".`,
    created,
  };
}

function faqSuccessSuffix(created: number, skippedMessage?: string) {
  if (created > 0) {
    return ` Generated ${created} FAQ${created === 1 ? "" : "s"} automatically.`;
  }
  if (skippedMessage) {
    return ` FAQ generation skipped: ${skippedMessage}`;
  }
  return "";
}

export { faqSuccessSuffix };
