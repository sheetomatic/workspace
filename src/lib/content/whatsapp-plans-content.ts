import { formatInr } from "@/lib/leads/categories";

export type WhatsappPlanCard = {
  id: string;
  messages: string;
  duration: string;
  price: number;
  highlight?: boolean;
  badge?: string;
};

export type OfficialWhatsappPlanCycle = "monthly" | "yearly";

export type OfficialWhatsappPlanCard = {
  id: string;
  title: string;
  cycle: OfficialWhatsappPlanCycle;
  price: number;
  validityLabel: string;
  features: readonly string[];
  planId?: string;
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
    email: "sheetomatic@gmail.com",
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

export const officialWhatsappPlans = {
  tabs: [
    { id: "monthly", label: "Monthly" },
    { id: "yearly", label: "Yearly (EXTRA OFF)" },
  ],
  plans: [
    {
      id: "official-basic-monthly",
      title: "Basic Plan - Monthly",
      cycle: "monthly",
      price: 1250,
      validityLabel: "30 days",
      planId: "66fe6a8ab879f3202370820c",
      features: [
        "UI / Frontend panel",
        "Basic chat bot builder",
        "Developer-friendly API and webhooks",
        "Bulk sending of template messages",
        "Creating bulk templates for Busy and other software",
        "Carousel template creation and sending",
        "Integration with Busy, Tally, Google Sheet (with API)",
        "No additional charges over and above meta messaging charges",
      ],
    },
    {
      id: "official-standard-monthly",
      title: "Standard Plan - Monthly",
      cycle: "monthly",
      price: 2500,
      validityLabel: "30 days",
      planId: "66fe6b12b879f32023708272",
      features: [
        "Includes all Basic Plan features",
        "WChatter inbox system with a single agent",
        "Contact management page with labels and attributes",
      ],
    },
    {
      id: "official-advance-monthly",
      title: "Advance Plan - Monthly",
      cycle: "monthly",
      price: 3750,
      validityLabel: "30 days",
      planId: "66fe6feeb879f32023708692",
      features: [
        "Includes all Standard Plan features",
        "WChatter team inbox with 10 agents",
        "Extra agent @ ₹600 per agent per month",
        "Integration with Dialogflow and ChatGPT",
        "Automation rule creation in team inbox",
        "Macros in team inbox",
        "Creating departments in inbox system",
        "Webhook on special conditions under team inbox",
      ],
    },
    {
      id: "official-starter-yearly",
      title: "Starter Plan - Yearly",
      cycle: "yearly",
      price: 3000,
      validityLabel: "365 days",
      planId: "694fbb832f12127e879f0eb2",
      features: [
        "Send messages from Busy / Tally",
        "Create templates for Busy Tally",
        "No additional charges over and above meta messaging charges",
        "(Message sending not available from UI / frontend)",
      ],
    },
    {
      id: "official-basic-yearly",
      title: "Basic Plan - Yearly",
      cycle: "yearly",
      price: 12000,
      validityLabel: "365 days",
      features: [
        "UI / Frontend panel",
        "Basic chat bot builder",
        "Developer-friendly API and webhooks",
        "Bulk sending of template messages",
        "Creating bulk templates for Busy and other software",
        "Carousel template creation and sending",
        "Integration with Busy, Tally, Google Sheet (with API)",
        "No additional charges over and above meta messaging charges",
      ],
    },
    {
      id: "official-standard-yearly",
      title: "Standard Plan - Yearly",
      cycle: "yearly",
      price: 24000,
      validityLabel: "365 days",
      planId: "66fe6acbb879f32023708236",
      features: [
        "Includes all Basic Plan features",
        "WChatter inbox system with a single agent",
        "Contact management page with labels and attributes",
      ],
    },
    {
      id: "official-advance-yearly",
      title: "Advance Plan - Yearly",
      cycle: "yearly",
      price: 36000,
      validityLabel: "365 days",
      planId: "66fe6b49b879f3202370829a",
      features: [
        "Includes all Standard Plan features",
        "WChatter team inbox with 10 agents",
        "Extra agent @ ₹600 per agent per month",
        "Integration with Dialogflow and ChatGPT",
        "Automation rule creation in team inbox",
        "Macros in team inbox",
        "Creating departments in inbox system",
        "Webhook on special conditions under team inbox",
      ],
    },
  ] satisfies OfficialWhatsappPlanCard[],
} as const;

export function whatsappPlanPrice(value: number) {
  return formatInr(value);
}
