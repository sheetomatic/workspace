import type { OrgExpenseCategory } from "@prisma/client";

export const ORG_EXPENSE_CATEGORY_LABELS: Record<OrgExpenseCategory, string> = {
  API_CURSOR: "Cursor (API / IDE)",
  API_OPENAI: "OpenAI API",
  API_WHATSAPP: "WhatsApp API",
  MARKETING: "Marketing",
  SALARY: "Team salary",
  OFFICE_RENT: "Office rent",
  MOBILE: "Mobile expenses",
  ELECTRICITY: "Electricity",
  SUBSCRIPTION_NETFLIX: "Netflix",
  SUBSCRIPTION_PRIME: "Amazon Prime",
  SUBSCRIPTION_OTHER: "Other subscription",
  PHONE_NUMBERS_PLAN: "Active numbers · plan / month",
  FUEL: "Fuel",
  VEHICLE_CAR: "Car",
  VEHICLE_BIKE: "Bike",
  VEHICLE_SCOOTY: "Scooty",
  OTHER: "Other",
};

export const ORG_EXPENSE_CATEGORY_GROUPS: Array<{
  title: string;
  categories: OrgExpenseCategory[];
}> = [
  {
    title: "API & tools",
    categories: ["API_CURSOR", "API_OPENAI", "API_WHATSAPP"],
  },
  {
    title: "Team & office",
    categories: ["SALARY", "OFFICE_RENT", "MOBILE", "ELECTRICITY", "MARKETING"],
  },
  {
    title: "Subscriptions",
    categories: ["SUBSCRIPTION_NETFLIX", "SUBSCRIPTION_PRIME", "SUBSCRIPTION_OTHER", "PHONE_NUMBERS_PLAN"],
  },
  {
    title: "Transport",
    categories: ["FUEL", "VEHICLE_CAR", "VEHICLE_BIKE", "VEHICLE_SCOOTY"],
  },
  {
    title: "Other",
    categories: ["OTHER"],
  },
];

export const ORG_EXPENSE_CATEGORIES = Object.keys(
  ORG_EXPENSE_CATEGORY_LABELS,
) as OrgExpenseCategory[];
