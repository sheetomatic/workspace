import type { AiKnowledgeStatus, AiKnowledgeType } from "@prisma/client";

export type AiKnowledgeActionState = {
  ok: boolean;
  message: string;
};

export const aiKnowledgeInitialState: AiKnowledgeActionState = {
  ok: false,
  message: "",
};

export type AiKnowledgeRow = {
  id: string;
  type: AiKnowledgeType;
  title: string;
  question: string | null;
  content: string;
  sourceUrl: string | null;
  status: AiKnowledgeStatus;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { name: string | null; email: string };
};

export const AI_KNOWLEDGE_TYPE_LABELS: Record<AiKnowledgeType, string> = {
  FAQ: "FAQ",
  DOCUMENT: "Document",
  WEBSITE: "Website",
  YOUTUBE_CHANNEL: "YouTube Channel",
};
