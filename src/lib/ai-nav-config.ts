import {
  BarChart3,
  Bot,
  BookOpen,
  FileCheck2,
  LayoutDashboard,
  MessageCircle,
  Plug,
  Radio,
  Ticket,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { AI_APP_MIN_ROLE } from "@/lib/ai-auth-links";
import type { SessionUser } from "@/lib/auth";

const ROLE_ORDER = ["VIEWER", "STAFF", "MANAGER", "ADMIN", "OWNER"] as const;

export type AiNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  minRole?: (typeof ROLE_ORDER)[number];
  /** Hidden from the default Train → Connect → Go Live path; shown under Advanced. */
  advanced?: boolean;
};

/** Essentials: Train → Connect → Go Live → Chats (+ Dashboard). */
export const AI_MAIN_NAV_ITEMS: AiNavItem[] = [
  { href: "/ai/app", label: "Dashboard", icon: LayoutDashboard, minRole: AI_APP_MIN_ROLE },
  { href: "/ai/app/inbox", label: "Chats", icon: MessageCircle, minRole: AI_APP_MIN_ROLE },
  { href: "/ai/app/knowledge", label: "Training", icon: BookOpen, minRole: "ADMIN" },
  { href: "/ai/app/campaign", label: "Go Live", icon: Radio, minRole: "ADMIN" },
  { href: "/ai/app/settings", label: "Connect", icon: Plug, minRole: "ADMIN" },
];

/** Advanced clutter — CRM, Agents, Workflows, Integrations, Analytics, Tickets, Templates. */
export const AI_ADVANCED_NAV_ITEMS: AiNavItem[] = [
  { href: "/ai/app/contacts", label: "CRM", icon: Users, minRole: AI_APP_MIN_ROLE, advanced: true },
  { href: "/ai/app/tickets", label: "Support hub", icon: Ticket, minRole: AI_APP_MIN_ROLE, advanced: true },
  { href: "/ai/app/analytics", label: "Analytics", icon: BarChart3, minRole: AI_APP_MIN_ROLE, advanced: true },
  { href: "/ai/app/templates", label: "Templates", icon: FileCheck2, minRole: "ADMIN", advanced: true },
  { href: "/ai/app/ai-brain", label: "AI Agents", icon: Bot, minRole: "ADMIN", advanced: true },
  { href: "/ai/app/integrations", label: "Integrations", icon: Plug, minRole: "ADMIN", advanced: true },
  { href: "/ai/app/automations", label: "Workflows", icon: Workflow, minRole: "ADMIN", advanced: true },
];

/** @deprecated Prefer AI_MAIN_NAV_ITEMS + AI_ADVANCED_NAV_ITEMS */
export const AI_AUTOMATION_NAV_ITEMS = AI_ADVANCED_NAV_ITEMS;

export function canAccessAiNav(
  userRole: SessionUser["role"],
  minRole?: AiNavItem["minRole"],
) {
  if (!minRole) {
    return true;
  }
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole);
}

export function getAiEssentialNavItems() {
  return AI_MAIN_NAV_ITEMS.filter((item) => !item.advanced);
}

export function getAiAdvancedNavItems() {
  return AI_ADVANCED_NAV_ITEMS.filter((item) => item.advanced !== false);
}
