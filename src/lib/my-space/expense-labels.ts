import type { OrgExpenseCategory } from "@prisma/client";

/** Standard display names for My Space expense categories. */
export const ORG_EXPENSE_CATEGORY_LABELS: Record<OrgExpenseCategory, string> = {
  API_CURSOR: "Cursor",
  API_OPENAI: "OpenAI",
  API_WHATSAPP: "WhatsApp API",
  MARKETING: "Marketing Cost",
  SALARY: "Salary of Team",
  OFFICE_RENT: "Office Rent",
  MOBILE: "Mobile Expenses",
  ELECTRICITY: "Electricity",
  INTERNET_WIFI: "Internet / WiFi",
  SUBSCRIPTION_NETFLIX: "Netflix",
  SUBSCRIPTION_PRIME: "Prime",
  SUBSCRIPTION_OTHER: "Other Subscription",
  PHONE_NUMBERS_PLAN: "Active Numbers · Plan / Month",
  FUEL: "Fuel Cost",
  VEHICLE_CAR: "Car",
  VEHICLE_BIKE: "Bike",
  VEHICLE_SCOOTY: "Scooty",
  EMI: "EMI",
  SCHOOL: "School Expense",
  GROCERY: "Grocery",
  VEGETABLES: "Vegetables",
  DRINKS: "Drinks",
  MEAT: "Meat",
  KIDS_DAILY: "Kids Daily Expense",
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
    categories: [
      "SALARY",
      "OFFICE_RENT",
      "MOBILE",
      "ELECTRICITY",
      "INTERNET_WIFI",
      "MARKETING",
    ],
  },
  {
    title: "Subscriptions",
    categories: [
      "SUBSCRIPTION_NETFLIX",
      "SUBSCRIPTION_PRIME",
      "SUBSCRIPTION_OTHER",
      "PHONE_NUMBERS_PLAN",
    ],
  },
  {
    title: "Transport",
    categories: ["FUEL", "VEHICLE_CAR", "VEHICLE_BIKE", "VEHICLE_SCOOTY"],
  },
  {
    title: "Home & family",
    categories: ["EMI", "SCHOOL", "GROCERY", "VEGETABLES", "DRINKS", "MEAT", "KIDS_DAILY"],
  },
  {
    title: "Other",
    categories: ["OTHER"],
  },
];

export const ORG_EXPENSE_CATEGORIES = Object.keys(
  ORG_EXPENSE_CATEGORY_LABELS,
) as OrgExpenseCategory[];

export const LEAD_PAYMENT_TYPE_LABELS: Record<string, string> = {
  ADVANCE: "Advance",
  PARTIAL: "Partial",
  FULL: "Full",
  TRAINING_FEE: "Training Fee",
  WHATSAPP_API_SETUP: "WhatsApp API Setup",
  WHATSAPP_API_RECHARGE: "WhatsApp API Recharge",
  YOUTUBE_ADSENSE: "YouTube AdSense",
  COURSE_FEE: "Course Fee",
};
