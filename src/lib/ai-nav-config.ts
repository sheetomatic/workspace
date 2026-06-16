import {
  BarChart3,
  Bot,
  BookOpen,
  FileCheck2,
  LayoutDashboard,
  MessageCircle,
  Plug,
  Radio,
  Settings,
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
};

export const AI_MAIN_NAV_ITEMS: AiNavItem[] = [
  { href: "/ai/app", label: "Dashboard", icon: LayoutDashboard, minRole: AI_APP_MIN_ROLE },
  { href: "/ai/app/inbox", label: "Chats", icon: MessageCircle, minRole: AI_APP_MIN_ROLE },
  { href: "/ai/app/contacts", label: "CRM", icon: Users, minRole: AI_APP_MIN_ROLE },
  { href: "/ai/app/tickets", label: "Support hub", icon: Ticket, minRole: AI_APP_MIN_ROLE },
  { href: "/ai/app/analytics", label: "Analytics", icon: BarChart3, minRole: AI_APP_MIN_ROLE },
  { href: "/ai/app/campaign", label: "Campaign", icon: Radio, minRole: "ADMIN" },
  { href: "/ai/app/templates", label: "Templates", icon: FileCheck2, minRole: "ADMIN" },
  { href: "/ai/app/settings", label: "Settings", icon: Settings, minRole: "ADMIN" },
];

export const AI_AUTOMATION_NAV_ITEMS: AiNavItem[] = [
  { href: "/ai/app/knowledge", label: "AI Training Data", icon: BookOpen, minRole: "ADMIN" },
  { href: "/ai/app/ai-brain", label: "AI Agents", icon: Bot, minRole: "ADMIN" },
  { href: "/ai/app/integrations", label: "Integrations", icon: Plug, minRole: "ADMIN" },
  { href: "/ai/app/automations", label: "Workflows", icon: Workflow, minRole: "ADMIN" },
];

export function canAccessAiNav(
  userRole: SessionUser["role"],
  minRole?: AiNavItem["minRole"],
) {
  if (!minRole) {
    return true;
  }
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole);
}
