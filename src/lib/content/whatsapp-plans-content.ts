import { formatInr } from "@/lib/leads/categories";

export const whatsappPlansPage = {
  eyebrow: "Unofficial WhatsApp API",
  title: "WhatsApp API subscription & integration plans",
  lead:
    "Send WhatsApp messages from Google Sheets with Sheetomatic's unofficial API integration. Setup once, recharge annually, and automate customer updates without official BSP fees for small teams.",
  freeApi: {
    title: "FREE API",
    text: "Direct integration with WhatsApp API for sending messages from your workflows.",
  },
  setup: {
    title: "Google Sheets API integration",
    text: "One-time setup to connect your sheet, templates, and triggers. Setup cost starts from",
    priceLabel: "INR 3,000+",
    note: "Final setup fee depends on sheet complexity, number of templates, and automation rules.",
  },
  annual: {
    title: "Annual subscription",
    price: 1499,
    text: "Annual charges for API access and platform maintenance.",
  },
  rechargePlans: [
    {
      name: "10,000 credits · 1 year",
      price: 10000,
      duration: "365 days",
    },
    {
      name: "Unlimited · 1 year",
      price: 24000,
      duration: "365 days",
    },
    {
      name: "Unlimited · 1 month",
      price: 4000,
      duration: "30 days",
    },
  ],
  integrationBundle: {
    name: "API setup + 10,000 credits · 1 year",
    price: 25000,
  },
  termsHref: "/terms/whatsapp-api",
  termsNote:
    "Unofficial API plans are subject to WhatsApp platform policies. Message delivery is not guaranteed during Meta outages.",
} as const;

export function whatsappPlanPrice(value: number) {
  return formatInr(value);
}
