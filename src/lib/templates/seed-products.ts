import type { TemplateProductType } from "@prisma/client";

/** Real catalog — add copy links when you send AppSheet / Sheets URLs. */
export const TEMPLATE_PRODUCT_SEEDS: Array<{
  slug: string;
  name: string;
  type: TemplateProductType;
  priceInr: number;
  description: string;
  sortOrder: number;
  thumbnailUrl?: string | null;
  copyLink?: string | null;
  active?: boolean;
}> = [
  {
    slug: "crm-lead-sheet-template",
    name: "CRM Lead Sheet Template",
    type: "SHEETS",
    priceInr: 499,
    description:
      "Google Sheets CRM lead tracker. Pay on UPI — after we confirm in CRM Leads, you get the Make a copy link by email.",
    sortOrder: 1,
    thumbnailUrl: "/images/templates/crm-lead-sheet-template.png",
    copyLink:
      "https://docs.google.com/spreadsheets/d/1uXguvsBaZPUQtlpz5DhH5Zdwb6DOxAuTbk64vErYsA8/copy",
    active: true,
  },
  {
    slug: "fms-sheet-template",
    name: "FMS Template",
    type: "SHEETS",
    priceInr: 499,
    description:
      "Google Sheets Flow Management System (FMS). Pay on UPI — after we confirm in CRM Leads, you get the Make a copy link by email.",
    sortOrder: 2,
    thumbnailUrl: "/images/templates/fms-sheet-template.png",
    copyLink:
      "https://docs.google.com/spreadsheets/d/18J1N4h7Mn9evj3JWmkV7oSUi-I46FPxC2NNjRKq_wa4/copy",
    active: true,
  },
  {
    slug: "appsheet-attendance-leave",
    name: "HRMS – Attendance & Leave (AppSheet)",
    type: "APPSHEET",
    priceInr: 1999,
    description:
      "WorkTrack Pro — one-time purchase HRMS for small teams. Real-time attendance tracking, simple in/out punches, leave requests with quick manager approval, and monthly attendance reports for payroll-ready insights. Pay on UPI — after confirmation we email your AppSheet copy link.",
    sortOrder: 10,
    thumbnailUrl: "/images/templates/appsheet-attendance-leave.png",
    copyLink:
      "https://www.appsheet.com/templates/?appGuidString=2d4e27df-96a7-4614-8e25-0522d2a77c7c",
    active: true,
  },
  {
    slug: "appsheet-visitor-tracking",
    name: "Visitor Tracking (AppSheet)",
    type: "APPSHEET",
    priceInr: 999,
    description:
      "AppSheet visitor check-in and tracking. Pay on UPI — after CRM confirm, we email your AppSheet copy link.",
    sortOrder: 11,
    thumbnailUrl: "/images/templates/appsheet-visitor-tracking.png",
    copyLink: null,
    active: true,
  },
  {
    slug: "appsheet-inventory-management",
    name: "Inventory Management System (AppSheet)",
    type: "APPSHEET",
    priceInr: 1499,
    description:
      "AppSheet inventory / stock management. Pay on UPI — after CRM confirm, we email your AppSheet copy link.",
    sortOrder: 12,
    thumbnailUrl: "/images/templates/appsheet-inventory-management.png",
    copyLink: null,
    active: true,
  },
  {
    slug: "appsheet-fms",
    name: "FMS (AppSheet)",
    type: "APPSHEET",
    priceInr: 1499,
    description:
      "AppSheet Flow Management System. Pay on UPI — after CRM confirm, we email your AppSheet copy link.",
    sortOrder: 13,
    thumbnailUrl: "/images/templates/appsheet-fms.png",
    copyLink: null,
    active: true,
  },
  {
    slug: "appsheet-task-management",
    name: "Task Management System (AppSheet)",
    type: "APPSHEET",
    priceInr: 999,
    description:
      "AppSheet task assignment and follow-up. Pay on UPI — after CRM confirm, we email your AppSheet copy link.",
    sortOrder: 14,
    thumbnailUrl: "/images/templates/appsheet-task-management.png",
    copyLink: null,
    active: true,
  },
  {
    slug: "appsheet-crm",
    name: "CRM (AppSheet)",
    type: "APPSHEET",
    priceInr: 1499,
    description:
      "AppSheet CRM for leads and follow-ups. Pay on UPI — after CRM confirm, we email your AppSheet copy link.",
    sortOrder: 15,
    thumbnailUrl: "/images/templates/appsheet-crm.png",
    copyLink: null,
    active: true,
  },
  {
    slug: "appsheet-grievance-management",
    name: "Grievance Management System (AppSheet)",
    type: "APPSHEET",
    priceInr: 1299,
    description:
      "AppSheet grievance / complaint tracking. Pay on UPI — after CRM confirm, we email your AppSheet copy link.",
    sortOrder: 16,
    thumbnailUrl: "/images/templates/appsheet-grievance-management.png",
    copyLink: null,
    active: true,
  },
  {
    slug: "appsheet-crm-electric-works",
    name: "CRM – Electric Works Shop (AppSheet)",
    type: "APPSHEET",
    priceInr: 1499,
    description:
      "Ready-made CRM built for electric works shops — track enquiries, customers, quotations, and job follow-ups in one AppSheet app. Pay on UPI — after confirmation we email your AppSheet copy link.",
    sortOrder: 17,
    thumbnailUrl: null,
    copyLink:
      "https://www.appsheet.com/templates/?appGuidString=44c60e0f-2247-43dc-9b51-61e7d30075ba",
    active: true,
  },
];
