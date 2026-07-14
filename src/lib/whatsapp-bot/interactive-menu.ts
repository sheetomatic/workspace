/** Stable IDs returned when a user taps a list row or reply button. */
import {
  KNOWLEDGE_MENU_PREFIX,
  menuLabelForItem,
  sortKnowledgeMenuItems,
  type KnowledgeMenuItem,
} from "@/lib/whatsapp-bot/knowledge-menu";
import type { Role } from "@prisma/client";
import { hasMinimumRole } from "@/lib/permissions";

export const WA_MENU = {
  DELEGATE_TASK: "delegate_task",
  MY_TASKS: "my_tasks",
  TEAM_PERFORMANCE: "team_performance",
  TEAM_LIST: "team_list",
  HELP: "help",
  MAIN_MENU: "main_menu",
  BROWSE_TOPICS: "customer_browse",
} as const;

export type WaMenuActionId = (typeof WA_MENU)[keyof typeof WA_MENU];

export function buildMainMenuList(
  userName: string,
  knowledgeItems: KnowledgeMenuItem[] = [],
  role: Role = "STAFF",
) {
  const firstName = userName.split(/\s+/)[0] || userName;
  const isManager = hasMinimumRole(role, "MANAGER");

  const actionRows = [
    ...(isManager
      ? [
          {
            id: WA_MENU.DELEGATE_TASK,
            title: "Assign a task",
            description: "Voice note or text to delegate",
          },
        ]
      : []),
    {
      id: WA_MENU.MY_TASKS,
      title: isManager ? "Team tasks" : "My tasks",
      description: "View and update active tasks",
    },
    {
      id: WA_MENU.TEAM_PERFORMANCE,
      title: isManager ? "Team performance" : "My performance",
      description: "Pending, done today, overdue stats",
    },
    ...(isManager
      ? [
          {
            id: WA_MENU.TEAM_LIST,
            title: "Team members",
            description: "See who you can assign work to",
          },
        ]
      : []),
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
      text: isManager
        ? `Hi ${firstName}! *Sheetomatic Tasks* on WhatsApp. Choose an option below, or send a voice note or text to assign work.`
        : `Hi ${firstName}! *Sheetomatic Tasks* on WhatsApp. Choose an option below.`,
    },
    footer: { text: "Reply menu anytime" },
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
          reply: { id: WA_MENU.DELEGATE_TASK, title: "Assign another" },
        },
        {
          type: "reply" as const,
          reply: { id: WA_MENU.MY_TASKS, title: "View tasks" },
        },
        {
          type: "reply" as const,
          reply: { id: WA_MENU.MAIN_MENU, title: "Main menu" },
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

/** Official Cloud CTA URL button (one URL button per message). */
export function buildCtaUrlInteractive(params: {
  body: string;
  buttonLabel: string;
  url: string;
  header?: string;
  footer?: string;
}) {
  return {
    type: "cta_url" as const,
    ...(params.header
      ? { header: { type: "text" as const, text: params.header.slice(0, 60) } }
      : {}),
    body: { text: params.body.slice(0, 1024) },
    ...(params.footer ? { footer: { text: params.footer.slice(0, 60) } } : {}),
    action: {
      name: "cta_url" as const,
      parameters: {
        display_text: params.buttonLabel.slice(0, 20),
        url: params.url,
      },
    },
  };
}

export type WhatsAppInteractivePayload = {
  type: "interactive";
  interactive:
    | ReturnType<typeof buildMainMenuList>
    | ReturnType<typeof buildPostTaskButtons>
    | ReturnType<typeof buildDelegatePromptButtons>
    | ReturnType<typeof buildCtaUrlInteractive>
    | ReturnType<
        typeof import("@/lib/whatsapp-bot/knowledge-menu").buildCustomerKnowledgeMenu
      >
    | ReturnType<
        typeof import("@/lib/whatsapp-bot/knowledge-menu").buildCustomerFollowUpButtons
      >
    | ReturnType<typeof import("@/lib/whatsapp-bot/task-user").buildMyTasksList>
    | ReturnType<typeof import("@/lib/whatsapp-bot/task-user").buildTaskActionButtons>;
};

export function wrapInteractive(
  interactive: WhatsAppInteractivePayload["interactive"],
): WhatsAppInteractivePayload {
  return { type: "interactive", interactive };
}
