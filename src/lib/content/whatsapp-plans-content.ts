import { formatInr } from "@/lib/leads/categories";

export type WhatsappPlanCard = {
  id: string;
  messages: string;
  duration: string;
  price: number;
  highlight?: boolean;
  badge?: string;
};

/** Plan data from sites.google.com/sheetomatic.in/sheetomatic/whatsapp-api-subscription */
export const whatsappPlansPage = {
  eyebrow: "Unofficial WhatsApp API",
  title: "WhatsApp API subscription & integration plans",
  lead:
    "Send WhatsApp messages from Google Sheets with Sheetomatic's unofficial API integration. Setup once, recharge as per plan, and automate customer updates.",
  freeApi: {
    title: "FREE API",
    text: "Direct integration with WhatsApp API for sending messages.",
  },
  setup: {
    title: "Google Sheets API integration",
    text: "For Google Sheets API Integration | Setup cost would be extra :",
    priceLabel: "INR 3,000+",
    note: "Final setup fee depends on sheet complexity, templates, and automation rules.",
  },
  plansSection: {
    title: "API recharge plans",
    subtitle: "Pick a plan by message credits and duration. All prices in INR.",
  },
  plans: [
    {
      id: "plan-4k-1m",
      messages: "4,000",
      duration: "1 month",
      price: 1499,
    },
    {
      id: "plan-unlimited-1m",
      messages: "Unlimited",
      duration: "1 month",
      price: 2999,
      badge: "Popular",
      highlight: true,
    },
    {
      id: "plan-12k-3m",
      messages: "12,000",
      duration: "3 months",
      price: 3999,
    },
    {
      id: "plan-10k-1y",
      messages: "10,000",
      duration: "1 year",
      price: 3999,
    },
    {
      id: "plan-24k-6m",
      messages: "24,000",
      duration: "6 months",
      price: 7999,
    },
    {
      id: "plan-48k-1y",
      messages: "48,000",
      duration: "1 year",
      price: 14999,
    },
    {
      id: "plan-unlimited-1y",
      messages: "Unlimited",
      duration: "1 year",
      price: 29999,
      badge: "Best value",
      highlight: true,
    },
  ] satisfies WhatsappPlanCard[],
  contact: {
    phone: "+919329103106",
    phoneDisplay: "+91 93291 03106",
    email: "training@sheetomatic.in",
    enquiryFormUrl: "https://forms.gle/aLUcf4fcAKdUXf3o6",
  },
  termsHref: "/terms/whatsapp-api",
  termsNote:
    "Unofficial API plans are subject to WhatsApp platform policies. Message delivery is not guaranteed during Meta outages.",
  payment: {
    upiId: "9329103106@ybl",
    payeeName: "SHYAM KUMAR BANJARE",
    qrImageSrc: "/images/payments/phonepe-qr-shyam-kumar-banjare.png",
  },
} as const;

export function whatsappPlanPrice(value: number) {
  return formatInr(value);
}
