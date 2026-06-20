import type { AiKnowledgeType } from "@prisma/client";
import {
  isWhatsAppMenuCommand,
  normalizeWhatsAppCommand,
} from "@/lib/whatsapp-bot/normalize-command";

export type KnowledgeMenuItem = {
  id: string;
  type: AiKnowledgeType;
  title: string;
  question: string | null;
  content: string;
  sourceUrl: string | null;
};

export const KNOWLEDGE_MENU_PREFIX = "kb:";

export const WA_CUSTOMER_MENU = {
  BROWSE_TOPICS: "customer_browse",
  HUMAN_HELP: "customer_human",
  ASK_QUESTION: "customer_ask",
} as const;

export type WaCustomerMenuActionId =
  (typeof WA_CUSTOMER_MENU)[keyof typeof WA_CUSTOMER_MENU];

const TYPE_ORDER: Record<AiKnowledgeType, number> = {
  YOUTUBE_CHANNEL: -1,
  FAQ: 0,
  DOCUMENT: 1,
  WEBSITE: 2,
};

function truncateText(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, max - 3)).trim()}...`;
}

export function sortKnowledgeMenuItems(items: KnowledgeMenuItem[]) {
  return [...items].sort((a, b) => {
    const typeDiff = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
    if (typeDiff !== 0) {
      return typeDiff;
    }
    return a.title.localeCompare(b.title);
  });
}

export function menuLabelForItem(item: KnowledgeMenuItem) {
  if (item.type === "YOUTUBE_CHANNEL") {
    return "Channel videos";
  }
  if (item.type === "FAQ" && item.question?.trim()) {
    return item.question.trim();
  }
  return item.title.trim();
}

export function menuDescriptionForItem(item: KnowledgeMenuItem) {
  if (item.type === "FAQ") {
    return truncateText(item.content, 72);
  }
  if (item.sourceUrl) {
    return truncateText(item.sourceUrl, 72);
  }
  return truncateText(item.content, 72);
}

export function buildCustomerKnowledgeMenu(
  organizationName: string,
  items: KnowledgeMenuItem[],
) {
  const sorted = sortKnowledgeMenuItems(items).slice(0, 10);

  const faqRows = sorted
    .filter((item) => item.type === "FAQ")
    .map((item) => ({
      id: `${KNOWLEDGE_MENU_PREFIX}${item.id}`,
      title: truncateText(menuLabelForItem(item), 24),
      description: truncateText(menuDescriptionForItem(item), 72),
    }));

  const channelRows = sorted
    .filter((item) => item.type === "YOUTUBE_CHANNEL")
    .map((item) => ({
      id: `${KNOWLEDGE_MENU_PREFIX}${item.id}`,
      title: truncateText(menuLabelForItem(item), 24),
      description: truncateText(item.sourceUrl ?? "Get video links", 72),
    }));

  const otherRows = sorted
    .filter((item) => item.type !== "FAQ" && item.type !== "YOUTUBE_CHANNEL")
    .map((item) => ({
      id: `${KNOWLEDGE_MENU_PREFIX}${item.id}`,
      title: truncateText(menuLabelForItem(item), 24),
      description: truncateText(menuDescriptionForItem(item), 72),
    }));

  const sections = [
    channelRows.length > 0 ? { title: "Videos", rows: channelRows } : null,
    faqRows.length > 0 ? { title: "FAQs", rows: faqRows } : null,
    otherRows.length > 0 ? { title: "Resources", rows: otherRows } : null,
  ].filter(Boolean) as Array<{ title: string; rows: typeof faqRows }>;

  return {
    type: "list" as const,
    header: { type: "text" as const, text: truncateText(organizationName, 60) },
    body: {
      text: "Pick a topic from your training data. The menu updates when you add or edit articles.",
    },
    footer: { text: "Sheetomatic AI" },
    action: {
      button: "Browse topics",
      sections,
    },
  };
}

export function buildCustomerFollowUpButtons() {
  return {
    type: "button" as const,
    body: {
      text: "Need anything else? Tap a button below.",
    },
    action: {
      buttons: [
        {
          type: "reply" as const,
          reply: { id: WA_CUSTOMER_MENU.BROWSE_TOPICS, title: "Browse topics" },
        },
        {
          type: "reply" as const,
          reply: { id: WA_CUSTOMER_MENU.ASK_QUESTION, title: "Ask question" },
        },
        {
          type: "reply" as const,
          reply: { id: WA_CUSTOMER_MENU.HUMAN_HELP, title: "Talk to team" },
        },
      ],
    },
  };
}

export function parseKnowledgeItemId(message: {
  type: string;
  interactive?: {
    button_reply?: { id?: string };
    list_reply?: { id?: string };
  };
}) {
  if (message.type !== "interactive" || !message.interactive) {
    return null;
  }

  const reply =
    message.interactive.button_reply ?? message.interactive.list_reply;
  const id = reply?.id;
  if (!id?.startsWith(KNOWLEDGE_MENU_PREFIX)) {
    return null;
  }

  const itemId = id.slice(KNOWLEDGE_MENU_PREFIX.length).trim();
  return itemId || null;
}

export function parseCustomerMenuAction(message: {
  type: string;
  interactive?: {
    button_reply?: { id?: string };
    list_reply?: { id?: string };
  };
}): WaCustomerMenuActionId | null {
  if (message.type !== "interactive" || !message.interactive) {
    return null;
  }

  const reply =
    message.interactive.button_reply ?? message.interactive.list_reply;
  const id = reply?.id;

  if (id === WA_CUSTOMER_MENU.BROWSE_TOPICS) {
    return WA_CUSTOMER_MENU.BROWSE_TOPICS;
  }
  if (id === WA_CUSTOMER_MENU.HUMAN_HELP) {
    return WA_CUSTOMER_MENU.HUMAN_HELP;
  }
  if (id === WA_CUSTOMER_MENU.ASK_QUESTION) {
    return WA_CUSTOMER_MENU.ASK_QUESTION;
  }

  return null;
}

export function mapCustomerTextShortcut(command: string) {
  if (
    isWhatsAppMenuCommand(command) ||
    normalizeWhatsAppCommand(command) === "topics" ||
    normalizeWhatsAppCommand(command) === "help"
  ) {
    return WA_CUSTOMER_MENU.BROWSE_TOPICS;
  }
  return null;
}

export function formatKnowledgeItemReply(item: KnowledgeMenuItem) {
  const label = menuLabelForItem(item);

  if (item.type === "FAQ" && item.question) {
    return [`*${item.question.trim()}*`, "", item.content.trim()].join("\n");
  }

  const lines = [`*${label}*`, "", item.content.trim()];
  if (item.sourceUrl) {
    lines.push("", item.sourceUrl);
  }
  return lines.join("\n").slice(0, 3500);
}

export function customerKnowledgeMenuFallback(
  organizationName: string,
  items: KnowledgeMenuItem[],
) {
  const sorted = sortKnowledgeMenuItems(items).slice(0, 10);
  if (sorted.length === 0) {
    return `Hi! ${organizationName} assistant is ready. Type your question and we will reply from our knowledge base.`;
  }

  const lines = sorted.map(
    (item, index) => `${index + 1}. ${menuLabelForItem(item)}`,
  );

  return [
    `*${organizationName}*`,
    "",
    "Choose a topic (menu updates from AI Training Data):",
    ...lines,
    "",
    "Reply with the number or type your question.",
    "Reply *menu* to refresh this list.",
  ].join("\n");
}

export function customerAskPromptText() {
  return [
    "*Ask your question*",
    "",
    "Type your message in one line. We will answer from approved training articles.",
    "",
    "Reply *menu* anytime to browse topics.",
  ].join("\n");
}

export function customerHumanHelpText(organizationName: string) {
  return [
    "*Talk to our team*",
    "",
    `Thanks for reaching out to ${organizationName}. A team member will reply here shortly.`,
    "",
    "Reply *menu* to browse common topics while you wait.",
  ].join("\n");
}
