/** Stable IDs returned when a user taps a list row or reply button. */
import {
  KNOWLEDGE_MENU_PREFIX,
  menuLabelForItem,
  sortKnowledgeMenuItems,
  type KnowledgeMenuItem,
} from "@/lib/whatsapp-bot/knowledge-menu";

export const WA_MENU = {
  DELEGATE_TASK: "delegate_task",
  TEAM_LIST: "team_list",
  HELP: "help",
  MAIN_MENU: "main_menu",
  BROWSE_TOPICS: "customer_browse",
} as const;

export type WaMenuActionId = (typeof WA_MENU)[keyof typeof WA_MENU];

export function buildMainMenuList(
  userName: string,
  knowledgeItems: KnowledgeMenuItem[] = [],
) {
  const firstName = userName.split(/\s+/)[0] || userName;

  const actionRows = [
    {
      id: WA_MENU.DELEGATE_TASK,
      title: "Delegate a task",
      description: "Send voice note or text to assign",
    },
    {
      id: WA_MENU.TEAM_LIST,
      title: "Team members",
      description: "See who you can assign work to",
    },
    {
      id: WA_MENU.BROWSE_TOPICS,
      title: "Browse topics",
      description: "FAQs, videos, and training articles",
    },
    {
      id: WA_MENU.HELP,
      title: "How it works",
      description: "Quick guide and examples",
    },
  ];

  const sorted = sortKnowledgeMenuItems(knowledgeItems).slice(0, 6);

  const topicRows = sorted.map((item) => ({
    id: `${KNOWLEDGE_MENU_PREFIX}${item.id}`,
    title:
      item.type === "YOUTUBE_CHANNEL"
        ? "Channel videos"
        : menuLabelForItem(item).slice(0, 24),
    description: (item.sourceUrl ?? item.title).slice(0, 72),
  }));

  const sections = [
    { title: "Quick actions", rows: actionRows },
    topicRows.length > 0 ? { title: "Topics & videos", rows: topicRows } : null,
  ].filter(Boolean) as Array<{ title: string; rows: typeof actionRows }>;

  return {
    type: "list" as const,
    header: { type: "text" as const, text: "Sheetomatic" },
    body: {
      text: `Hi ${firstName}! Choose what you want to do next.`,
    },
    footer: { text: "Task delegation and AI topics" },
    action: {
      button: "Open menu",
      sections,
    },
  };
}

export function buildPostTaskButtons() {
  return {
    type: "button" as const,
    body: {
      text: "Task saved. What would you like to do next?",
    },
    action: {
      buttons: [
        {
          type: "reply" as const,
          reply: { id: WA_MENU.DELEGATE_TASK, title: "Delegate another" },
        },
        {
          type: "reply" as const,
          reply: { id: WA_MENU.MAIN_MENU, title: "Main menu" },
        },
        {
          type: "reply" as const,
          reply: { id: WA_MENU.TEAM_LIST, title: "Team list" },
        },
      ],
    },
  };
}

export function buildDelegatePromptButtons() {
  return {
    type: "button" as const,
    body: {
      text: [
        "Send a voice note or type your task in one message.",
        "",
        "Example:",
        "Satyam, finish website front-end phase 1 by today.",
      ].join("\n"),
    },
    action: {
      buttons: [
        {
          type: "reply" as const,
          reply: { id: WA_MENU.MAIN_MENU, title: "Back to menu" },
        },
        {
          type: "reply" as const,
          reply: { id: WA_MENU.TEAM_LIST, title: "Team list" },
        },
        {
          type: "reply" as const,
          reply: { id: WA_MENU.HELP, title: "Help" },
        },
      ],
    },
  };
}

export type WhatsAppInteractivePayload = {
  type: "interactive";
  interactive:
    | ReturnType<typeof buildMainMenuList>
    | ReturnType<typeof buildPostTaskButtons>
    | ReturnType<typeof buildDelegatePromptButtons>
    | ReturnType<
        typeof import("@/lib/whatsapp-bot/knowledge-menu").buildCustomerKnowledgeMenu
      >
    | ReturnType<
        typeof import("@/lib/whatsapp-bot/knowledge-menu").buildCustomerFollowUpButtons
      >;
};

export function wrapInteractive(
  interactive: WhatsAppInteractivePayload["interactive"],
): WhatsAppInteractivePayload {
  return { type: "interactive", interactive };
}
