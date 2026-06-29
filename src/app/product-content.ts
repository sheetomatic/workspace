import {
  AI_LOGIN_HREF,
  AI_START_FREE_HREF,
} from "@/lib/ai-auth-links";
import {
  Bot,
  Brain,
  Globe,
  Inbox,
  Languages,
  MessageCircle,
  Route,
  Ticket,
  UserCheck,
  Users,
  Workflow,
  BookOpen,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ProductFeature = {
  icon: LucideIcon;
  title: string;
  text: string;
};

export const productHome = {
  eyebrow: "WhatsApp sales system",
  title: "Attract leads, convert in CRM, empower your team",
  lead:
    "WhatsApp AI captures every inquiry. Inbox and CRM turn chats into follow-ups. Shared workspace lets AI handle routine while your team closes.",
  primaryCta: "Start AI pilot",
  secondaryCta: "See pricing",
  loginCta: "Log in",
};

export const trustedBy = [
  "Ecommerce brands",
  "Real estate teams",
  "Clinics & hospitals",
  "Travel agencies",
  "Coaching institutes",
  "SaaS startups",
  "Logistics operators",
];

export const productFeatures: ProductFeature[] = [
  {
    icon: Zap,
    title: "Instant AI Replies",
    text: "Answer FAQs, qualify leads, and share order updates in seconds on WhatsApp.",
  },
  {
    icon: Users,
    title: "WhatsApp CRM",
    text: "Contacts, tags, pipeline stages, and assignment rules in one place.",
  },
  {
    icon: Globe,
    title: "Website Chatbot",
    text: "Same AI brain on your site  -  capture leads and hand off to WhatsApp.",
  },
  {
    icon: Inbox,
    title: "Team Inbox",
    text: "Shared inbox with notes, ownership, and human takeover when needed.",
  },
  {
    icon: MessageCircle,
    title: "Contacts & Leads",
    text: "Auto-capture numbers, intents, and source campaigns from every chat.",
  },
  {
    icon: Ticket,
    title: "Tickets",
    text: "Turn conversations into trackable support tickets with SLAs.",
  },
  {
    icon: Workflow,
    title: "Intent-Based Workflows",
    text: "Route booking, pricing, and support intents to the right flow or agent.",
  },
  {
    icon: Languages,
    title: "Multilingual AI",
    text: "Reply in the customer's language  -  Hindi, English, and more.",
  },
  {
    icon: BookOpen,
    title: "Knowledge Base Training",
    text: "Train from website URLs, PDFs, and FAQs  -  no code required.",
  },
  {
    icon: UserCheck,
    title: "Human Handoff",
    text: "AI handles routine queries; your team steps in with full context.",
  },
];

export const launchSteps = [
  {
    step: "1",
    title: "Sign up",
    text: "Create your workspace and connect your business WhatsApp number.",
  },
  {
    step: "2",
    title: "Train chatbot",
    text: "Add your website, documents, or FAQ answers to the AI knowledge base.",
  },
  {
    step: "3",
    title: "Go live",
    text: "Turn on auto-replies, invite your team, and start converting chats.",
  },
];

export const industryUseCases = [
  { name: "Ecommerce", text: "Order status, returns, and product recommendations." },
  { name: "Real Estate", text: "Site visits, brochure sharing, and lead qualification." },
  { name: "Healthcare", text: "Appointments, reports, and follow-up reminders." },
  { name: "Travel", text: "Itineraries, bookings, and payment links on WhatsApp." },
  { name: "Education", text: "Admissions, course info, and demo scheduling." },
  { name: "SaaS", text: "Trial support, onboarding, and billing questions." },
  { name: "Logistics", text: "Dispatch updates, POD, and delivery exceptions." },
];

export const testimonials = [
  {
    quote:
      "We stopped losing night-time WhatsApp leads. The AI handles 70% of queries and our team sees everything in one inbox.",
    name: "Priya Mehta",
    role: "Operations Head, D2C brand",
  },
  {
    quote:
      "Setup took one afternoon. We trained it on our price list and FAQ  -  customers get answers in Hindi or English instantly.",
    name: "Arjun Kulkarni",
    role: "Founder, regional services company",
  },
  {
    quote:
      "Human handoff is smooth. Agents see AI confidence, intent, and past notes before they reply.",
    name: "Neha Sharma",
    role: "Customer Success Lead",
  },
];

export const pricingEnquireIncludes = [
  "WhatsApp voice and text task delegation",
  "Assignee alerts and status updates on WhatsApp",
  "Web task board for managers and staff",
  "Team onboarding and go-live support",
  "Official WhatsApp Business API via RedLava",
];

export const pricingEnquireFaqs = [
  {
    q: "How do I get a quote?",
    a: "Tap Chat on WhatsApp and tell us your team size and how you want to use tasks. We reply with a simple plan breakdown, usually within one business day.",
  },
  {
    q: "Is there a setup fee?",
    a: "Most teams have a one-time onboarding package for WhatsApp connection and training. We share exact numbers on the call, with no hidden lines on the invoice.",
  },
  {
    q: "Do I need a developer?",
    a: "No. We configure WhatsApp, set up your workspace, and show your team how to assign and complete work from their phones.",
  },
  {
    q: "Are WhatsApp message charges included?",
    a: "WhatsApp API usage (RedLava / Meta) is billed separately based on volume. We help you estimate that when we share your quote.",
  },
];

export const pricingPageFaqs = pricingEnquireFaqs;

export const productFaqs = [
  {
    q: "Do I need a developer to set this up?",
    a: "No. Sheetomatic is built for business owners and ops teams. Sign up, connect WhatsApp, add your knowledge base, and go live in minutes.",
  },
  {
    q: "Does this work with the official WhatsApp Business API?",
    a: "Yes. We support RedLava / Meta Cloud API for templates, campaigns, and scale  -  plus team inbox and AI on top.",
  },
  {
    q: "Can my team take over from the AI?",
    a: "Always. Toggle human mode per conversation, assign owners, and leave internal notes without losing context.",
  },
  {
    q: "What languages are supported?",
    a: "The AI detects customer language and responds accordingly. Hindi and English are fully supported out of the box.",
  },
  {
    q: "Is there a free trial?",
    a: "Task + WhatsApp Messages starts after a setup call. For Tasks + WhatsApp AI full access, contact us for enterprise plan options and pilot access.",
  },
  {
    q: "What is the difference between Task and AI full access?",
    a: "Task + WhatsApp Messages is for your internal team — delegate work by voice or text on WhatsApp. Tasks + WhatsApp AI full access adds customer chatbot, lead capture, CRM inbox, and knowledge-trained replies.",
  },
  {
    q: "How much does WhatsApp AI full access cost?",
    a: "We do not list fixed prices for Tasks + WhatsApp AI full access online. Contact us on WhatsApp for an enterprise plan quote based on your team size and message volume.",
  },
  {
    q: "What is included in the price?",
    a: "Task plans cover delegation and workspace. AI plans include everything in Task plus customer-facing AI. WhatsApp API charges from RedLava or Meta are separate and based on usage.",
  },
];

export const chatbotPage = {
  eyebrow: "Attracting customers",
  title: "WhatsApp AI that captures leads 24/7",
  lead:
    "Train AI on your FAQs and offers. It replies instantly, qualifies intent, and saves every contact before your team joins the chat.",
  cta: "Connect WhatsApp",
  useCases: [
    "Product & pricing FAQs",
    "Order tracking and delivery updates",
    "Appointment booking and reminders",
    "Lead qualification before sales handoff",
    "Multilingual support for regional customers",
  ],
};

export const crmPage = {
  eyebrow: "Converting sales",
  title: "Inbox, CRM, and follow-ups that close deals",
  lead:
    "Every WhatsApp chat lands in one pipeline. Assign owners, set follow-up tasks, and track stages without losing context.",
  cta: "Open Team Inbox",
};

export type PricingPlanCta = "signup" | "whatsapp" | "contact";

export type PricingTierId = "task-whatsapp" | "ai-full";

export type PricingPlan = {
  tier: PricingTierId;
  name: string;
  monthlyInr: number | null;
  annualInr: number | null;
  perUserAnnualInr: number | null;
  setupFeeInr: number | null;
  customLabel?: string;
  trialDays?: number;
  description: string;
  featured: boolean;
  badge?: string;
  limits: string[];
  cta: string;
  ctaType: PricingPlanCta;
  whatsappMessage?: string;
};

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export const pricingSection = {
  eyebrow: "Pricing",
  title: "Pricing that fits your team",
  subcopy:
    "Tell us about your team on WhatsApp and we will share a clear quote with setup, onboarding, and support included.",
};

export const pricingTiers = {
  taskWhatsapp: {
    id: "task-whatsapp" as const,
    kicker: "Task + WhatsApp Messages",
    title: "Delegation on WhatsApp",
    subcopy:
      "Voice or text assignment, assignee alerts, and web task board. Enquire for a quote tailored to your team.",
    anchor: "task-whatsapp",
  },
  aiFull: {
    id: "ai-full" as const,
    kicker: "Tasks + WhatsApp AI — full access",
    title: "Everything above, plus customer AI and CRM",
    subcopy:
      "Lead capture, AI-trained replies, shared inbox, contacts, and knowledge base. Contact us for enterprise and full-access pricing tailored to your volume.",
    anchor: "ai-full",
  },
};

export const aiEnterpriseContact = {
  title: "Enterprise & full-access plans",
  lead:
    "Customer AI, CRM inbox, lead capture, and knowledge training — priced by team size, message volume, and onboarding scope.",
  features: [
    "Tasks + WhatsApp Messages included for your team",
    "Customer AI replies from your knowledge base",
    "Lead capture, contacts, and shared inbox",
    "WhatsApp go-live and training support",
    "Custom limits for high-volume MSMEs",
  ],
  cta: "Contact for enterprise plans",
  whatsappMessage:
    "Hi Sheetomatic, I want Tasks + WhatsApp AI full access. Please share enterprise plan options for my business.",
};

export const pricingFootnotes = [
  "Final pricing is shared after a short enquiry — tailored to team size and scope.",
  "WhatsApp API message charges (RedLava / Meta) are billed separately based on usage.",
  "GST applies as per Indian tax rules on your invoice.",
];

/** Task + WhatsApp Messages — delegation lane (competitive with task-only bots) */
export const taskWhatsappPlans: PricingPlan[] = [
  {
    tier: "task-whatsapp",
    name: "Task on WhatsApp",
    monthlyInr: null,
    annualInr: null,
    perUserAnnualInr: 2500,
    setupFeeInr: 25000,
    description:
      "Voice or text on WhatsApp → task created → assignee notified. Best for owner-led MSME teams.",
    featured: true,
    badge: "Delegation",
    limits: [
      "WhatsApp voice + text task delegation",
      "Assign tasks to team from WhatsApp",
      "WhatsApp alerts to assignees",
      "Web task board (/app/tasks)",
      "Manager+ roles on WhatsApp numbers",
      "No customer AI or CRM inbox",
    ],
    cta: "Enquire on WhatsApp",
    ctaType: "whatsapp",
    whatsappMessage:
      "Hi Sheetomatic, I would like to know about pricing for Task + WhatsApp Messages for my team. Please share plan options.",
  },
];

export const aiFullAccessPlans: PricingPlan[] = [
  {
    tier: "ai-full",
    name: "AI Pilot",
    monthlyInr: 0,
    annualInr: null,
    perUserAnnualInr: null,
    setupFeeInr: null,
    trialDays: 14,
    description: "Try full access — customer AI, inbox, lead capture, and task delegation.",
    featured: false,
    limits: [
      "500 WhatsApp messages / month",
      "200 AI reply credits",
      "1 team member",
      "1 WhatsApp number",
      "Task delegation included",
      "FAQ + document training",
    ],
    cta: "Start free pilot",
    ctaType: "signup",
  },
  {
    tier: "ai-full",
    name: "AI Pro",
    monthlyInr: 4999,
    annualInr: 49999,
    perUserAnnualInr: null,
    setupFeeInr: null,
    description: "Full AI access for small teams going live on customer WhatsApp.",
    featured: false,
    limits: [
      "5,000 messages / month",
      "2,000 AI credits",
      "3 team members",
      "1 WhatsApp number",
      "Lead capture + CRM inbox",
      "Task delegation included",
    ],
    cta: "Get AI Pro on WhatsApp",
    ctaType: "whatsapp",
    whatsappMessage:
      "Hi Sheetomatic, I want Tasks + WhatsApp AI full access — AI Pro (₹4,999/month).",
  },
  {
    tier: "ai-full",
    name: "AI Growth",
    monthlyInr: 6999,
    annualInr: 69999,
    perUserAnnualInr: null,
    setupFeeInr: null,
    description: "Higher volume, 10 seats, and priority go-live for growing MSMEs.",
    featured: true,
    badge: "Full access",
    limits: [
      "25,000 messages / month",
      "10,000 AI credits",
      "10 team members",
      "2 WhatsApp numbers",
      "Knowledge + website training",
      "Task delegation included",
    ],
    cta: "Get AI Growth on WhatsApp",
    ctaType: "whatsapp",
    whatsappMessage:
      "Hi Sheetomatic, I want Tasks + WhatsApp AI full access — AI Growth (₹6,999/month).",
  },
  {
    tier: "ai-full",
    name: "AI Business",
    monthlyInr: null,
    annualInr: null,
    perUserAnnualInr: null,
    setupFeeInr: null,
    customLabel: "Custom",
    description: "Multiple brands, high volume, custom integrations, and dedicated support.",
    featured: false,
    limits: [
      "Custom message & AI limits",
      "Unlimited team members",
      "Multiple WhatsApp numbers",
      "Custom knowledge + workflows",
      "Dedicated onboarding",
      "Task + AI full access",
    ],
    cta: "Talk to sales",
    ctaType: "whatsapp",
    whatsappMessage:
      "Hi Sheetomatic, I need a custom AI Business plan with full WhatsApp AI access.",
  },
];

/** @deprecated Use taskWhatsappPlans or aiFullAccessPlans */
export const pricingPlans = [...taskWhatsappPlans, ...aiFullAccessPlans];

export function getTaskPlanPriceLabel() {
  const plan = taskWhatsappPlans.find((item) => item.name === "Task on WhatsApp");
  if (!plan?.perUserAnnualInr) {
    return "Task + WhatsApp Messages";
  }
  return `${formatInr(plan.perUserAnnualInr)}/user/year`;
}

export function getAiProPlanPriceLabel() {
  return "enterprise plans on request";
}

export const dashboardNavPreview = [
  { label: "Dashboard", href: "/ai/app" },
  { label: "Inbox", href: "/ai/app/inbox" },
  { label: "AI Brain", href: "/ai/app/ai-brain" },
  { label: "Knowledge Base", href: "/ai/app/knowledge" },
  { label: "Automations", href: "/ai/app/automations" },
  { label: "Contacts", href: "/ai/app/contacts" },
  { label: "Tickets", href: "/ai/app/tickets" },
  { label: "Analytics", href: "/ai/app/analytics" },
  { label: "Integrations", href: "/ai/app/integrations" },
];
